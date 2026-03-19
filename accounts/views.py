from django.shortcuts import render,redirect
from django.http import HttpResponse
from .forms import LoginForm, RegisterForm
from django.contrib.auth import authenticate,login,logout
from django.contrib.auth.models import User
# Create your views here.

def registerview(request):
    register_form = RegisterForm()
    if request.method == "POST":
        register_form = RegisterForm(request.POST)
        if register_form.is_valid():
            first_name = register_form.cleaned_data["first_name"]
            last_name = register_form.cleaned_data["last_name"]
            username = register_form.cleaned_data["username"]
            email = register_form.cleaned_data["email"]
            password = register_form.cleaned_data["password"]

            user = User.objects.create_user(first_name=first_name,last_name=last_name,username = username,email=email,password=password)
            user.save()

            return redirect("accounts:login")
    context = {
        "register_form" : register_form
    }
    return render(request,"register.html",context)

def loginview(request):
    login_form = LoginForm()
    if request.method == "POST":
        login_form = LoginForm(request.POST)
        if login_form.is_valid():
            username = login_form.cleaned_data["username"]
            password = login_form.cleaned_data["password"]
            user = authenticate(username=username,password=password)
            login(request,user)
            return redirect("main:index")

    context = {
        "login_form" : login_form,
    }

    return render(request,"login.html",context)

def logoutview(request):
    logout(request)
    return redirect("accounts:login")