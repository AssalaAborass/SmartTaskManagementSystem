from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'
        extra_kwargs = {
            'completed': {'required': False, 'default': False},  
            'user': {'required': False}  
        }

    def create(self, validated_data):
        """Ensure default values for missing fields"""
        validated_data.setdefault('status', 'To Do')  # Default status
        validated_data.setdefault('priority', 'Medium')  # Default priority
        return super().create(validated_data)
