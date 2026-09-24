from django.urls import path 
from .views import dashboard_main

urlpatterns = [
    path('',dashboard_main,name="dashboard")
]
