import { NextResponse } from 'next/server';
import { createProposedRoadmap } from '@/lib/ai/planner';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    if (!body.goalTitle || typeof body.goalTitle !== 'string') {
      return NextResponse.json({ error: 'goalTitle string is required' }, { status: 400 });
    }

    let timeframeWeeks = body.timeframeWeeks;
    let targetDate = body.targetDate;

    if (targetDate && !timeframeWeeks) {
      const parsedTarget = new Date(targetDate).getTime();
      const diffMs = parsedTarget - Date.now();
      if (!isNaN(parsedTarget) && diffMs > 0) {
        timeframeWeeks = Math.max(1, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
      }
    }

    const proposal = await createProposedRoadmap(body.goalTitle, timeframeWeeks, targetDate);
    return NextResponse.json(proposal);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to synthesize roadmap' }, { status: 500 });
  }
}
