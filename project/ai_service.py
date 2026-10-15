
import json
import os

from groq import Groq


client = Groq(api_key=os.environ["GROQ_API_KEY"])

MODEL = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile",
)

SYSTEM_PROMPT = """
You create plans for a Jira-like project management system.

Return JSON only, with this structure:

{
  "summary": "Plan summary",
  "questions": [],
  "project": {
    "project_name": "Example project",
    "description": "Description",
    "status": "planning",
    "priority": "medium",
    "tags": []
  },
  "tasks": [
    {
      "task_name": "Example task",
      "description": "Task details",
      "status": "todo",
      "priority": "high",
      "estimated_time": 120,
      "tags": [],
      "note": ""
    }
  ]
}

Rules:
- Project statuses: planning, active, on_hold, completed.
- Task statuses: todo, in_progress, blocked, done.
- Priorities: low, medium, high, urgent.
- estimated_time is an integer representing minutes or null.
- Do not invent user IDs or assign users without verified information.
- Do not include fields that are not in the schema.
- Ask questions if essential information is missing.
- Do not claim that records have been created.
"""


def generate_plan(user_request, previous_plan=None):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]

    if previous_plan:
        messages.append({
            "role": "user",
            "content": (
                "Revise this proposed plan:\n"
                + json.dumps(previous_plan)
                + "\n\nUser feedback:\n"
                + user_request
                + "\nReturn the complete revised plan."
            ),
        })
    else:
        messages.append({
            "role": "user",
            "content": user_request,
        })

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=3000,
    )

    content = response.choices[0].message.content

    if not content:
        raise ValueError("Groq returned an empty response.")

    return json.loads(content)
