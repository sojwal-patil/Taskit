from django.shortcuts import render,get_object_or_404,redirect
from .models import Task
from .forms import TaskForm
# Create your views here.

def index(request):
    tasks = Task.objects.all().order_by("-id")
    if request.method == "POST":
        form = TaskForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("index")
    else:
        form = TaskForm()

    context = {
        "form" :form,
        "tasks" : tasks,
        }
    return render(request,"index.html",context)

def delete(request,id):
    if request.method == "POST":
        task = get_object_or_404(Task,pk=id)
        task.delete()
        return redirect("index")
    return render(request,"delete.html",{"task":task})

def edit(request,id):
    task = get_object_or_404(Task,pk=id)
    if request.method == "POST":
        form = TaskForm(request.POST,instance=task)
        if form.is_valid():
            form.save()
            return redirect("index")
    else:
        form = TaskForm(instance=task)
        context = {
        "task" : task,
        "form" : form,
        }
    return render(request,"edit.html",context)