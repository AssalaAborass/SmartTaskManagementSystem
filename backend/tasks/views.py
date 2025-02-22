from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Task
from .serializers import TaskSerializer

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by('-due_date')
    serializer_class = TaskSerializer
    permission_classes = [AllowAny]  # Temporarily allow anyone to access the API
