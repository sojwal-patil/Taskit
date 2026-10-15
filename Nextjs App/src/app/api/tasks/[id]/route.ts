import { NextResponse } from 'next/server';
import { updateTask, toggleChecklistItem, deleteTask, addChecklistItem, deleteChecklistItem } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    if (body.action === 'toggle_checklist') {
      const item = await toggleChecklistItem(id, body.itemId, body.isCompleted);
      return NextResponse.json(item);
    }

    if (body.action === 'add_checklist') {
      const item = await addChecklistItem(id, body.title);
      return NextResponse.json(item);
    }

    if (body.action === 'delete_checklist') {
      const success = await deleteChecklistItem(body.itemId);
      return NextResponse.json({ success });
    }

    const updatedTask = await updateTask(id, body, user.id);
    if (!updatedTask) {
      return NextResponse.json({ error: 'Task not found or unauthorized' }, { status: 404 });
    }
    return NextResponse.json(updatedTask);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const success = await deleteTask(id, user.id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete task or unauthorized' }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete task' }, { status: 500 });
  }
}
