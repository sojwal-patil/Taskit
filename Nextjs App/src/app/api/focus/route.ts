import { NextResponse } from 'next/server';
import { saveFocusSession, getFocusSessions } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const sessions = await getFocusSessions(user.id);
    return NextResponse.json(sessions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch focus sessions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    if (!body.taskTitle) {
      return NextResponse.json({ error: 'taskTitle is required' }, { status: 400 });
    }

    const session = await saveFocusSession(body, user.id);
    return NextResponse.json(session, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to log focus session' }, { status: 500 });
  }
}
