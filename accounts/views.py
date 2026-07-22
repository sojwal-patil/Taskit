from django.shortcuts import render,redirect
from django.contrib.auth.models import User
from django.contrib.auth import authenticate,login,logout
import os
from django.conf import settings
# Create your views here.


def login_view(request):
    if request.method == "POST":
        email = request.POST.get('email')
        password = request.POST.get('password')
        try:
            user_obj = User.objects.get(email=email)
            print(user_obj.username)
        except User.DoesNotExist:
            user_obj = None
        
        if user_obj:
            user = authenticate(request,username=user_obj.username,password=password)
            login(request,user)
            return redirect("google.com")
    return render(request,"accounts/login.html")

def signup_view(request):
    if request.method == "POST":
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        password = request.POST.get('password')
        User.objects.create_user(first_name=first_name,last_name=last_name,email=email,username=first_name+last_name,password=password)
        return redirect("accounts:login_view")
    return render(request,"accounts/create-account.html")

def logout_view(request):
    logout(request)
    return redirect("accounts:login_view")