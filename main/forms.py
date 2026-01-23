from django import forms
from .models import Task
class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = ["task_name","deadline","category"]
        widgets = {
            "task_name" : forms.TextInput(attrs={"placeholder":"Enter Name of Task"}),
             "deadline" : forms.DateInput(attrs={"type":"date"})
         }