import { NextResponse } from 'next/server';
import { applyRecoveryPlan, getRecoveryPlan } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const goalId = searchParams.get('goalId');
    if (!goalId) {
      return NextResponse.json({ error: 'goalId parameter is required' }, { status: 400 });
    }
    const plan = await getRecoveryPlan(goalId, user.id);
    if (!plan) {
      return NextResponse.json({ error: 'Recovery plan not found' }, { status: 404 });
    }
    return NextResponse.json(plan);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch recovery plan' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    if (!body.goalId || !body.planId || !Array.isArray(body.selectedAdjustmentIds)) {
      return NextResponse.json(
        { error: 'goalId, planId, and selectedAdjustmentIds array are required' },
        { status: 400 }
      );
    }

    const result = await applyRecoveryPlan(
      body.goalId,
      body.planId,
      body.selectedAdjustmentIds,
      user.id
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to apply recovery plan' }, { status: 500 });
  }
}
