from django.db import models

# Create your models here.


class Project(models.Model):
    project_name = models.CharField(max_length=20)
    description = models.CharField(max_length=300)
    start_date = models.DateField(auto_now_add=True)
    deadline = models.DateField()
    status = models.CharField(max_length=20)
    priority = models.CharField(max_length=20)
    progress = models.IntegerField()
    tags = models.CharField(max_length=20)
    project_notes = models.CharField(max_length=500)


class Task(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    task_name = models.CharField(max_length=20)
    description = models.CharField(300)
    status = models.CharField(max_length=20)
    priority = models.CharField(max_length=20)
    deadline = models.DateField()
    estimated_time = models.CharField(max_length=20)
    actual_time = models.CharField(max_length=20)
    tags = models.CharField(max_length=20)
    assignee = models.CharField(max_length=20)
    note = models.CharField(max_length=50)
    attachments = models.FileField()


class SubTask(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    sub_task_name = models.CharField(max_length=20)
    description = models.CharField(300)
    status = models.CharField(max_length=20)
    priority = models.CharField(max_length=20)
    deadline = models.DateField()
    estimated_time = models.CharField(max_length=20)
    actual_time = models.CharField(max_length=20)
    tags = models.CharField(max_length=20)
    assignee = models.CharField(max_length=20)
    note = models.CharField(max_length=50)
    attachments = models.FileField()