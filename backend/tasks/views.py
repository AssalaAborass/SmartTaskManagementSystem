from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.viewsets import ModelViewSet
from .models import Task
from .serializers import TaskSerializer, SubtaskSerializer
from django.contrib.auth.models import User
from django.conf import settings
import openai
import json
import requests
from datetime import datetime, timedelta
import dateparser
import re
import calendar
from django.db import models 
from .models import Task, SubTask
import traceback



class TaskViewSet(ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]  # Only allow authenticated users

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)  # Show only user's tasks

    def perform_create(self, serializer):
        """Ensure required fields are set properly"""
        serializer.save(
            user=self.request.user,
            status=self.request.data.get('status', 'To Do'),  
            priority=self.request.data.get('priority', 'Medium'),
            completed=self.request.data.get('completed', False),
            description=self.request.data.get('description', ''),  # Default empty
            due_date=self.request.data.get('due_date', None)  # Default to None
        )

    def update(self, request, *args, **kwargs):
        """Handle task updates, including status changes"""
        task = self.get_object()
        serializer = self.get_serializer(task, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    

# Register a New User
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    if request.method == 'POST':
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({"error": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "message": "User registered successfully",
            "access": str(refresh.access_token),
            "refresh": str(refresh)
        }, status=status.HTTP_201_CREATED)


def get_next_weekday(target_day):
    """
    Given a weekday name (e.g., "Friday"), returns the next occurrence of that weekday.
    """
    today = datetime.today().date()
    days_of_week = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, 
        "friday": 4, "saturday": 5, "sunday": 6
    }
    
    target_day = target_day.lower()
    
    if target_day not in days_of_week:
        return None  # Invalid weekday name

    target_day_num = days_of_week[target_day]
    today_num = today.weekday()
    
    days_ahead = (target_day_num - today_num) % 7
    if days_ahead == 0:  # If today is the target day, return the next occurrence
        days_ahead = 7
    
    return (today + timedelta(days=days_ahead)).isoformat()


def extract_due_date(text):
    """Extracts a due date from a given text, ensuring it is in the future."""
    print("Text received for date extraction:", text)

    today = datetime.today().date()
    print("Current date:", today)

    # Check structured date format: "Due Date: YYYY-MM-DD"
    explicit_date_pattern = r'Due Date:\s*(\d{4}-\d{2}-\d{2})'
    explicit_match = re.search(explicit_date_pattern, text)
    if explicit_match:
        extracted_date = explicit_match.group(1)
        parsed_date = datetime.strptime(extracted_date, "%Y-%m-%d").date()
        if parsed_date < today:
            print("Date is in the past, adjusting...")
            parsed_date += timedelta(weeks=1)
        print("Extracted structured date:", parsed_date)
        return parsed_date.isoformat()

    # Check natural date formats like "May 3, 2025"
    general_date_pattern = r'\b(\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4})\b'
    match = re.search(general_date_pattern, text, re.IGNORECASE)
    if match:
        date_str = match.group(0)
        parsed_date = dateparser.parse(date_str).date()
        if parsed_date < today:
            print("Date is in the past, adjusting...")
            parsed_date += timedelta(weeks=1)
        print("Extracted natural date:", parsed_date)
        return parsed_date.isoformat()

    # Check relative dates ("next Friday", "this Thursday", etc.)
    relative_date_pattern = r'\b(next|this)?\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b'
    match = re.search(relative_date_pattern, text, re.IGNORECASE)
    if match:
        reference = match.group(1) or "next"  # Default to "next" if not explicitly stated
        weekday = match.group(2)
        
        if reference.lower() == "this":
            next_date = get_next_weekday(weekday)
        else:
            next_date = get_next_weekday(weekday)

        if next_date:
            print("Extracted relative weekday date:", next_date)
            return next_date

    # Fallback: General date extraction using dateparser
    parsed_date = dateparser.parse(text, settings={'PREFER_DATES_FROM': 'future'})
    if parsed_date:
        parsed_date = parsed_date.date()
        if parsed_date < today:
            print("Date is in the past, adjusting...")
            parsed_date += timedelta(weeks=1)
        print("Extracted fallback date:", parsed_date)
        return parsed_date.isoformat()

    print("No valid date found")
    return None  # No date found


def format_due_date(due_date):
    """Convert YYYY-MM-DD to 'March 10, 2025' format."""
    if due_date:
        parsed_date = datetime.strptime(due_date, "%Y-%m-%d")
        return f"{calendar.month_name[parsed_date.month]} {parsed_date.day}, {parsed_date.year}"
    return None

def generate_task_from_description(user_input):
    try:
        today_date = datetime.today().strftime("%Y-%m-%d")  # Get today's date
        today_day = datetime.today().strftime("%A")  # Get today's day name

        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "mistral",
                "prompt": f"Today's date is {today_date}, and today is {today_day}. "
                        f"Create a task based on this input:\n\n"
                        f"User input: \"{user_input}\" \n\n"
                        f"Return the response in this format:\n"
                        f"Title: [Short Title]\n"
                        f"Description: [Accurate description, NO extra details]\n"
                        f"Priority: [High, Medium, Low]\n"
                        f"Due Date: [YYYY-MM-DD or None]\n"
            },
            stream=True
        )


        full_response = ""
        for line in response.iter_lines():
            if line:
                try:
                    parsed_json = json.loads(line.decode("utf-8"))
                    if "response" in parsed_json:
                        full_response += parsed_json["response"]
                except json.JSONDecodeError:
                    continue

        if not full_response.strip():
            return {"error": "Ollama returned an empty response"}

        print("Full Ollama response:", full_response)

        # Extract title
        title_match = re.search(r"Title:\s*(.+)", full_response)
        title = title_match.group(1).strip() if title_match else "Generated Task"
        title = re.sub(r"\b(High|Medium|Low) Priority\b", "", title)  # Remove priority from title
        title = re.sub(r"\bDue Date:\s*\d{4}-\d{2}-\d{2}\b", "", title)  # Remove due date from title
        title = re.sub(r"\(Adjusted Date\)", "", title).strip() # Remove adjusted date
        title = title.strip()

        # Extract description
        description_match = re.search(r"Description:\s*(.*?)(?=\n\s*Priority:|\n\s*Due Date:|$)", full_response, re.DOTALL)
        description = description_match.group(1).strip() if description_match else "No description provided."
        description = re.sub(r"Priority:\s*(High|Medium|Low)", "", description)  # Remove priority from description
        description = re.sub(r"Due Date:\s*\d{4}-\d{2}-\d{2}", "", description)  # Remove due date from description
        description = description.strip()

        print("Extracted Description:", description)


        # Extract due date
        due_date = extract_due_date(user_input) or extract_due_date(full_response)

        # Extract priority from AI response
        priority = "Medium"  # Default
        priority_pattern = r'\b(High|Medium|Low) Priority\b'
        priority_match = re.search(priority_pattern, full_response, re.IGNORECASE)
        if priority_match:
            priority = priority_match.group(1).capitalize()

        # Enforce priority based on due date urgency
        if due_date:
            due_date_obj = datetime.strptime(due_date, "%Y-%m-%d").date()
            days_until_due = (due_date_obj - datetime.today().date()).days

            if days_until_due <= 2:
                priority = "High"
            elif days_until_due <= 5:
                priority = "Medium"
            else:
                priority = "Low"


        # Override priority if task is due within 1 day
        if due_date:
            due_date_obj = datetime.strptime(due_date, "%Y-%m-%d").date()
            if (due_date_obj - datetime.today().date()).days <= 1:
                priority = "High"

        return {
            "title": title,
            "description": description if description else "No description provided.",
            "priority": priority,
            "due_date": due_date  # Correctly set the deadline
        }

    except Exception as e:
        return {"error": f"Server error: {str(e)}"}


# Django API Endpoint to generate and save a task
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_task(request):
    user_input = request.data.get("description", "")

    if not user_input:
        return Response({"error": "Task description is required"}, status=status.HTTP_400_BAD_REQUEST)

    task_data = generate_task_from_description(user_input)

    if "error" in task_data:
        return Response(task_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Save generated task to database with AI-suggested priority
    task = Task.objects.create(
        user=request.user,
        title=task_data["title"],
        description=task_data["description"],
        priority=task_data["priority"],  # Now storing AI-generated priority
        due_date=task_data["due_date"] if task_data["due_date"] else None
    )

    serializer = TaskSerializer(task)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def suggest_task(request):
#     """
#     AI-based recommendation: Suggests the most urgent task to start.
#     """
#     token = request.auth  # Extract the user's authentication token
#     tasks = Task.objects.filter(user=request.user, status="To Do").order_by("due_date", "-priority")

#     if not tasks.exists():
#         return Response({"message": "No tasks available to suggest."}, status=200)

#     # Get the most urgent and high-priority task
#     task = tasks.first()

#     return Response({
#         "task": {
#             "title": task.title,
#             "description": task.description,
#             "due_date": task.due_date,
#             "priority": task.priority,
#         }
#     }, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def suggest_ai_task(request):
    """
    AI-based recommendation: Suggests the most urgent task to start and moves it to 'In Progress'.
    Tasks are ordered by:
    1. Priority: High > Medium > Low
    2. Due date: Earliest first
    3. Task creation date (if due dates are the same)
    """
    tasks = Task.objects.filter(user=request.user, status="To Do").order_by(
        models.Case(
            models.When(priority="High", then=1),
            models.When(priority="Medium", then=2),
            models.When(priority="Low", then=3),
            default=4,  # Default if something is wrong
            output_field=models.IntegerField(),
        ),
        "due_date",  # Tasks with the closest due date first
        "created_at",  # Oldest task first (FIFO)
    )

    if not tasks.exists():
        return Response({"message": "No tasks available to suggest."}, status=200)

    # Get the highest priority, most urgent task
    task = tasks.first()

    # Move task to "In Progress"
    task.status = "In Progress"
    task.save()

    return Response({
        "task": {
            "id": task.id,  # ID for UI update
            "title": task.title,
            "description": task.description,
            "due_date": task.due_date,
            "priority": task.priority,
            "status": task.status  # Ensure frontend knows the task has moved
        }
    }, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def suggest_subtasks(request, task_id):
    """
    AI generates up to 3 subtasks based on task description.
    """
    try:
        task = Task.objects.get(id=task_id, user=request.user)
    except Task.DoesNotExist:
        return Response({"error": "Task not found"}, status=404)

    # Send task details to AI
    ai_response = requests.post(
        "http://127.0.0.1:11434/api/generate",
        json={
            "model": "mistral",
            "prompt": f"Break this task into up to 3 concise subtasks. Each subtask should be short and actionable:\n\n"
                      f"Task: {task.title}\n"
                      f"Description: {task.description}\n"
                      f"Format:\n"
                      f"- [Subtask 1]\n"
                      f"- [Subtask 2]\n"
                      f"- [Subtask 3]\n"
        },
        stream=True
    )

    # Concatenate AI response properly
    full_response = ""
    for line in ai_response.iter_lines():
        if line:
            try:
                parsed_json = json.loads(line.decode("utf-8"))
                if "response" in parsed_json:
                    full_response += parsed_json["response"]  # Append response
            except json.JSONDecodeError:
                continue
    
    print("Full Ollama response:", full_response)

    # Extract up to 3 subtasks
    subtask_titles = re.findall(r"(?:\d+\.\s*|\-\s*)([^:]+):?", full_response)
    subtask_titles = [title.strip(": ").strip() for title in subtask_titles[:3]]  # Remove leading symbols

    # If no subtasks were extracted, return an error message.
    if not subtask_titles:
        print("Error: No valid subtasks extracted from AI response!")
        return Response({"error": "No valid subtasks generated"}, status=500)

    # Generate due dates
    due_date = task.due_date  # Use the parent task's due date if available
    today = datetime.today().date()

    # Calculate the subtask due date 
    subtask_due_dates = []
    if due_date:
        total_days = (due_date - today).days
        if total_days < 1:
            subtask_due_dates = [due_date] * len(subtask_titles)  # Due today
        else:
            subtask_due_dates = [
                today + timedelta(days=(i * (total_days // len(subtask_titles))))
                for i in range(len(subtask_titles))
            ]
    else :
        subtask_due_dates = [None] * len(subtask_titles) # No due date 

    # Create subtasks in DB with due dates
    subtasks_list = []
    for i, title in enumerate(subtask_titles):
        subtask = SubTask.objects.create(
            task=task, title=title.strip(), completed=False
        )
        subtasks_list.append({
            "id": subtask.id,
            "title": subtask.title,
            "due_date": subtask_due_dates[i].isoformat() if subtask_due_dates[i] else None 
        })

    # Return updated task with subtasks
    return Response({"subtasks": subtasks_list}, status=201)


def generate_subtasks(task):
    """Generates subtasks based on task complexity and due date"""
    if not task.due_date:
        return  # No due date, no need for subtasks

    today = datetime.today().date()
    due_date = task.due_date

    total_days = (due_date - today).days
    if total_days < 1:
        return  # No need to split if it's due today

    num_subtasks = min(total_days, 3)  # Split into 3 subtasks max

    subtask_titles = [
        "Plan & Research",
        "Work on Main Task",
        "Final Review & Submission"
    ]

    for i in range(num_subtasks):
        subtask_due_date = today + timedelta(days=(i * (total_days // num_subtasks)))

        Subtask.objects.create(
            task=task,
            title=subtask_titles[i % len(subtask_titles)],
            due_date=subtask_due_date
        )
