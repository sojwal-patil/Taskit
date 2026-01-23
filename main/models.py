from django.db import models

# Create your models here.

class Task(models.Model):
    task_name = models.CharField(max_length=50,null=False,blank=False)
    deadline = models.DateField(null=True)
    created_at = models.DateTimeField(auto_now_add=True,null=False)
    CATE = [
        ("P","Personal"),
        ("W","Work"),
        ("S","Study"),
        ("F","Finance"),
        ("H","HouseHold"),
        ("O","Others")
    ]
    category = models.CharField(choices=CATE,max_length=1,default="Select")

    def __str__(self):
        return f"{self.task_name} {self.deadline}"