
import json
import logging

from datetime import timedelta

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_POST

from .models import (
    Workspace,
    Project,
    Task,
    AIPlan,
    AIPlanRevision,
)
from .ai_service import generate_plan

logger = logging.getLogger(__name__)


def read_json(request):
    try:
        data = json.loads(request.body or b"{}")
        if not isinstance(data, dict):
            raise ValueError
        return data
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
        return None


def validate_plan(data):
    if not isinstance(data, dict):
        raise ValueError("Plan must be an object.")

    project = data.get("project")
    tasks = data.get("tasks")

    if not isinstance(project, dict):
        raise ValueError("Project details are missing.")

    if not isinstance(tasks, list) or len(tasks) > 100:
        raise ValueError("Tasks must be a list of at most 100 items.")

    if not isinstance(project.get("project_name"), str):
        raise ValueError("Project name is required.")

    if not project["project_name"].strip():
        raise ValueError("Project name cannot be empty.")

    if len(project["project_name"]) > 150:
        raise ValueError("Project name is too long.")

    if project.get("status", "planning") not in Project.Status.values:
        raise ValueError("Invalid project status.")

    if project.get("priority", "medium") not in Project.Priority.values:
        raise ValueError("Invalid project priority.")

    if not isinstance(project.get("tags", []), list):
        raise ValueError("Project tags must be a list.")

    for item in tasks:
        if not isinstance(item, dict):
            raise ValueError("Each task must be an object.")

        title = item.get("task_name")

        if not isinstance(title, str) or not title.strip():
            raise ValueError("Every task needs a title.")

        if len(title) > 200:
            raise ValueError("A task title is too long.")

        if item.get("status", "todo") not in Task.Status.values:
            raise ValueError("Invalid task status.")

        if item.get("priority", "medium") not in Task.Priority.values:
            raise ValueError("Invalid task priority.")

        estimate = item.get("estimated_time")

        if estimate is not None:
            if (
                isinstance(estimate, bool)
                or not isinstance(estimate, int)
                or not 0 <= estimate <= 10_000_000
            ):
                raise ValueError("Invalid task time estimate.")

        if not isinstance(item.get("tags", []), list):
            raise ValueError("Task tags must be a list.")

    return data


@login_required
@require_POST
def create_ai_plan(request):
    body = read_json(request)

    if body is None:
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    prompt = body.get("prompt")
    workspace_id = body.get("workspace_id")

    if not isinstance(prompt, str) or not prompt.strip():
        return JsonResponse({"error": "Prompt is required."}, status=400)

    if len(prompt) > 10000:
        return JsonResponse({"error": "Prompt is too long."}, status=400)

    workspace = Workspace.objects.filter(
        id=workspace_id,
        created_by=request.user,
    ).first()

    if not workspace:
        return JsonResponse(
            {"error": "Workspace not found or access denied."},
            status=404,
        )

    try:
        proposed = generate_plan(prompt)
        validate_plan(proposed)

        if proposed.get("questions"):
            return JsonResponse({
                "needs_clarification": True,
                "questions": proposed["questions"],
                "proposed_plan": proposed,
            })

        with transaction.atomic():
            plan = AIPlan.objects.create(
                workspace=workspace,
                created_by=request.user,
                request=prompt,
                plan_data=proposed,
                version=1,
            )

            AIPlanRevision.objects.create(
                plan=plan,
                version=1,
                plan_data=proposed,
            )

        return JsonResponse({
            "plan_id": str(plan.id),
            "version": plan.version,
            "status": plan.status,
            "plan": plan.plan_data,
        }, status=201)

    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception:
        logger.exception("AI plan generation failed")
        return JsonResponse(
            {"error": "Unable to generate a plan right now."},
            status=502,
        )


@login_required
@require_POST
def revise_ai_plan(request, plan_id):
    body = read_json(request)

    if body is None:
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    feedback = body.get("feedback")

    if not isinstance(feedback, str) or not feedback.strip():
        return JsonResponse(
            {"error": "Revision feedback is required."},
            status=400,
        )

    if len(feedback) > 5000:
        return JsonResponse({"error": "Feedback is too long."}, status=400)

    try:
        with transaction.atomic():
            plan = AIPlan.objects.select_for_update().filter(
                id=plan_id,
                created_by=request.user,
                status=AIPlan.Status.REVIEW,
            ).first()

            if not plan:
                return JsonResponse(
                    {"error": "Reviewable plan not found."},
                    status=404,
                )

            proposed = generate_plan(
                feedback,
                previous_plan=plan.plan_data,
            )
            validate_plan(proposed)

            if proposed.get("questions"):
                return JsonResponse({
                    "needs_clarification": True,
                    "questions": proposed["questions"],
                    "proposed_plan": proposed,
                })

            next_version = plan.version + 1

            AIPlanRevision.objects.create(
                plan=plan,
                version=next_version,
                feedback=feedback,
                plan_data=proposed,
            )

            plan.plan_data = proposed
            plan.version = next_version
            plan.save(update_fields=["plan_data", "version"])

        return JsonResponse({
            "plan_id": str(plan.id),
            "version": plan.version,
            "status": plan.status,
            "plan": plan.plan_data,
        })

    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception:
        logger.exception("AI plan revision failed")
        return JsonResponse(
            {"error": "Unable to revise the plan right now."},
            status=502,
        )


@login_required
@require_POST
def approve_ai_plan(request, plan_id):
    try:
        with transaction.atomic():
            plan = AIPlan.objects.select_for_update().filter(
                id=plan_id,
                created_by=request.user,
                status=AIPlan.Status.REVIEW,
            ).first()

            if not plan:
                return JsonResponse(
                    {"error": "Reviewable plan not found."},
                    status=404,
                )

            # Execute the exact latest revision.
            revision = AIPlanRevision.objects.get(
                plan=plan,
                version=plan.version,
            )
            data = validate_plan(revision.plan_data)

            # Never trust a client-supplied plan at approval time.
            project_data = data["project"]

            project = Project.objects.create(
                workspace=plan.workspace,
                created_by=request.user,
                project_name=project_data["project_name"].strip(),
                description=project_data.get("description", ""),
                status=project_data.get("status", "planning"),
                priority=project_data.get("priority", "medium"),
                tags=project_data.get("tags", []),
            )

            created_tasks = []

            for item in data["tasks"]:
                task = Task.objects.create(
                    project=project,
                    created_by=request.user,
                    task_name=item["task_name"].strip(),
                    description=item.get("description", ""),
                    status=item.get("status", "todo"),
                    priority=item.get("priority", "medium"),
                    estimated_time=item.get("estimated_time"),
                    tags=item.get("tags", []),
                    note=item.get("note", ""),
                )
                created_tasks.append(task)

            plan.status = AIPlan.Status.COMPLETED
            plan.approved_at = timezone.now()
            plan.save(update_fields=["status", "approved_at"])

        return JsonResponse({
            "message": "Plan approved and executed successfully.",
            "project_id": project.id,
            "project_name": project.project_name,
            "created_task_count": len(created_tasks),
            "task_ids": [task.id for task in created_tasks],
        })

    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception:
        logger.exception("AI plan execution failed")
        return JsonResponse(
            {"error": "Plan execution failed; no partial changes were saved."},
            status=500,
        )
