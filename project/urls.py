
from django.urls import path
from . import views

urlpatterns = [
    path(
        "ai/plan/",
        views.create_ai_plan,
        name="create_ai_plan",
    ),
    path(
        "ai/plan/<uuid:plan_id>/revise/",
        views.revise_ai_plan,
        name="revise_ai_plan",
    ),
    path(
        "ai/plan/<uuid:plan_id>/approve/",
        views.approve_ai_plan,
        name="approve_ai_plan",
    ),
]
