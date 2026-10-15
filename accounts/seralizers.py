from rest_framework import serializers
from .models import User

class UserSeralizer(serializers.ModelSerializer):
    class Meta:
        model = User 
        fields = ["first_name","last_name","username","email","phone_number"]