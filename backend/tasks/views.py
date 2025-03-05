from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.viewsets import ModelViewSet
from .models import Task
from .serializers import TaskSerializer
from django.contrib.auth.models import User
from django.conf import settings
import openai
import json
import requests
from datetime import datetime, timedelta
import dateparser
import re
import calendar


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
