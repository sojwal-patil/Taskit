from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

class UserRoles(models.TextChoices):
    ADMIN = 'admin', 'Admin'
    MEMBER = 'member', 'Member'
    VIEWER = 'viewer', 'Viewer'
    GUEST = 'guest', 'Guest'

class User(AbstractUser):
    phone_number = models.CharField(max_length=15)
    created_on = models.DateTimeField(auto_now_add=True)
    role = models.CharField(max_length=10, choices=UserRoles.choices, default=UserRoles.MEMBER)