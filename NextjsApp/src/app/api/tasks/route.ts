import { NextResponse } from 'next/server';
import { createTask } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.goalId || !body.title) {
      return NextResponse.json({ error: 'goalId and title are required' }, { status: 400 });
    }

    const task = await createTask(body.goalId, body, user.id);
    if (!task) {
      return NextResponse.json({ error: 'Failed to create task' }, { status: 400 });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create task' }, { status: 500 });
  }
}
