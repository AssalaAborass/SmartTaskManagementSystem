from django.db import models
from django.contrib.auth.models import User

class Task(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)  # New field
    due_date = models.DateField(null=True, blank=True)  # New field
    priority = models.CharField(
        max_length=10,
        choices=[('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High')],
        default='Medium'  # Default to Medium
    )
    status = models.CharField(
        max_length=20,
        choices=[('To Do', 'To Do'), ('In Progress', 'In Progress'), ('Completed', 'Completed')],
        default='To Do'  # Default status
    )
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
