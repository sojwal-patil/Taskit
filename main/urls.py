from django.urls import path 
from .views import index,menu

urlpatterns = [
    path("",index,name="index"),
    path("menu/",menu,name="menu")
]
