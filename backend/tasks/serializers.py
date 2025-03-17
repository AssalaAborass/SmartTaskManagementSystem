# from rest_framework import serializers
# from .models import Task

# class TaskSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Task
#         fields = '__all__'
#         extra_kwargs = {
#             'completed': {'required': False, 'default': False},  
#             'user': {'required': False}  
#         }

#     def create(self, validated_data):
#         """Ensure default values for missing fields"""
#         validated_data.setdefault('status', 'To Do')  # Default status
#         validated_data.setdefault('priority', 'Medium')  # Default priority
#         return super().create(validated_data)


from rest_framework import serializers
from .models import Task, SubTask

class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):
    subtasks = SubtaskSerializer(many=True, read_only=True)  # Include subtasks in Task response

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
