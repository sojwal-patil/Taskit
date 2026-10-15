import { NextResponse } from 'next/server';
import { getGoals, createGoalFromProposal, createManualGoal, deleteAllGoals } from '@/lib/storage';
import { getAuthSession } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const goals = await getGoals(user.id);
    return NextResponse.json(goals);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    if (!body.title) {
      return NextResponse.json({ error: 'Goal title is required' }, { status: 400 });
    }

    let newGoal;
    if (body.milestones && Array.isArray(body.milestones)) {
      newGoal = await createGoalFromProposal(body, user.id);
    } else {
      newGoal = await createManualGoal(body, user.id);
    }

    return NextResponse.json(newGoal, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create goal' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getAuthSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const success = await deleteAllGoals(user.id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete all goals' }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'All goals deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete all goals' }, { status: 500 });
  }
}
