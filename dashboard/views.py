from django.shortcuts import render
from django.http import HttpResponse
# Create your views here.

def dashboard_main(request):
    return HttpResponse("Hey How are you?")