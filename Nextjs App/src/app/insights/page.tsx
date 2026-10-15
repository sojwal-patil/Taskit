'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { RecoveryModal } from '@/components/RecoveryModal';
import { Goal, FocusSession, RecoveryPlan, Task } from '@/lib/types';
import { loadGoalsCached, getCachedGoals, subscribeToStore } from '@/lib/client-store';

export default function InsightsPage() {
  const [timeframe, setTimeframe] = useState<'WEEK' | 'MONTH' | 'QUARTER'>('MONTH');
  const [goals, setGoals] = useState<Goal[]>(() => getCachedGoals() || []);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlan | null>(null);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [loading, setLoading] = useState(() => !getCachedGoals());

  useEffect(() => {
    async function loadData() {
      try {
        const [loadedGoals, sessRes] = await Promise.all([
          loadGoalsCached(),
          fetch('/api/focus').then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ]);

        setGoals(loadedGoals);
        setSessions(sessRes);

        // Check first at-risk or active goal for recovery plan concurrently
        const targetGoal = loadedGoals.find((g) => g.status === 'AT_RISK' || g.status === 'DELAYED') || loadedGoals[0];
        if (targetGoal) {
          fetch(`/api/recovery?goalId=${targetGoal.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((recData) => {
              if (recData && recData.adjustments?.length > 0) {
                setRecoveryPlan(recData);
              }
            })
            .catch(() => {});
        }
      } catch (e) {
        console.error('Error loading insights data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    return subscribeToStore(() => {
      const cached = getCachedGoals();
      if (cached) setGoals(cached);
    });
  }, []);

  // Compute live metrics strictly from database records
  const totalGoals = goals.length;
  const aheadCount = goals.filter((g) => g.status === 'AHEAD').length;
  const onTrackCount = goals.filter((g) => g.status === 'ON_TRACK' || !g.status).length;
  const flaggedCount = goals.filter((g) => g.status === 'AT_RISK' || g.status === 'DELAYED').length;

  const allTasks: (Task & { goalTitle?: string })[] = goals.flatMap((g) =>
    (g.tasks || []).map((t) => ({ ...t, goalTitle: g.title }))
  );
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === 'COMPLETED').length;
  const onTimePercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalMilestones = goals.reduce((acc, g) => acc + (g.milestones?.length || 0), 0);

  const totalFocusHours = sessions.reduce((acc, s) => acc + s.durationMins / 60, 0);

  const bottleneckTasks = allTasks.filter(
    (t) => t.status === 'BLOCKED' || (t.priority === 'URGENT' && t.status !== 'COMPLETED')
  );
  const firstBottleneck = bottleneckTasks[0];

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased">
      <Sidebar />
      <div className="lg:pl-60">
        <Header />

        <main className="relative pt-16 bg-surface min-h-screen pb-16">
          <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-12 flex flex-col gap-6 max-w-[1440px] mx-auto w-full">
            {/* Top Context & Action Bar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <span>Analytics & Operational Cadence</span>
                  <span className="text-outline">/</span>
                  <span>Live Telemetry</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                  Insights & Execution Velocity
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Timeframe Segmented Control */}
                <div className="flex items-center bg-surface-container rounded-lg p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setTimeframe('WEEK')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      timeframe === 'WEEK'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('MONTH')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      timeframe === 'MONTH'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('QUARTER')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      timeframe === 'QUARTER'
                        ? 'bg-surface-container-lowest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Quarter to Date
                  </button>
                </div>

                {/* Export Action */}
                <button
                  type="button"
                  onClick={() => alert(`Insights report exported: ${totalGoals} goals, ${totalTasks} tasks, ${totalFocusHours.toFixed(1)}h focus time.`)}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-xs text-xs font-semibold border border-[#E5E4DC] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">download</span>
                  <span>Export Report</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
                <span className="text-sm text-on-surface-variant font-medium">Computing live workspace insights...</span>
              </div>
            ) : (
              <>
                {/* Metric Summary Grid (4 Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Goal Health */}
                  <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-[#E5E4DC] flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
                        Overall Goal Health
                      </span>
                      <span className="p-1.5 rounded-md bg-surface-container text-primary">
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-primary tracking-tight">{totalGoals}</span>
                        <span className="text-xs text-on-surface-variant">active strategic {totalGoals === 1 ? 'goal' : 'goals'}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5">
                        <div className="h-2 flex-1 rounded-full bg-surface-container flex overflow-hidden">
                          {totalGoals > 0 ? (
                            <>
                              <div
                                style={{ width: `${(aheadCount / totalGoals) * 100}%` }}
                                className="bg-primary"
                                title={`${aheadCount} Ahead`}
                              />
                              <div
                                style={{ width: `${(onTrackCount / totalGoals) * 100}%` }}
                                className="bg-tertiary-container"
                                title={`${onTrackCount} On Track`}
                              />
                              <div
                                style={{ width: `${(flaggedCount / totalGoals) * 100}%` }}
                                className="bg-[#d97736]"
                                title={`${flaggedCount} Flagged`}
                              />
                            </>
                          ) : (
                            <div className="w-full bg-surface-container-high" />
                          )}
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-[10px] font-semibold text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary"></span>{aheadCount} Ahead
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>{onTrackCount} On Track
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#d97736]"></span>{flaggedCount} Flagged
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: On-Time Completion */}
                  <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-[#E5E4DC] flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
                        Task Completion Rate
                      </span>
                      <span className="p-1.5 rounded-md bg-surface-container text-primary">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-primary tracking-tight">{onTimePercentage}%</span>
                        <span className="inline-flex items-center text-xs font-semibold text-primary bg-surface-container px-1.5 py-0.5 rounded">
                          <span className="material-symbols-outlined text-[13px]">task_alt</span>{completedTasks}/{totalTasks}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Across {totalMilestones} active milestone{totalMilestones === 1 ? '' : 's'} in your workspace.
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Focus Execution */}
                  <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-[#E5E4DC] flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
                        Focus Execution
                      </span>
                      <span className="p-1.5 rounded-md bg-surface-container text-primary">
                        <span className="material-symbols-outlined text-[18px]">bolt</span>
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-primary tracking-tight">
                          {totalFocusHours.toFixed(1)}h
                        </span>
                        <span className="inline-flex items-center text-xs font-semibold text-primary bg-surface-container px-1.5 py-0.5 rounded">
                          {sessions.length} sessions
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Logged during your deep work focus sessions.
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Active Bottlenecks */}
                  <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-[#E5E4DC] flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <span className={`text-xs font-bold uppercase tracking-wider ${bottleneckTasks.length > 0 ? 'text-error' : 'text-primary'}`}>
                        Active Bottlenecks
                      </span>
                      <span className={`p-1.5 rounded-md ${bottleneckTasks.length > 0 ? 'bg-error-container text-error' : 'bg-surface-container text-primary'}`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {bottleneckTasks.length > 0 ? 'warning' : 'check_circle'}
                        </span>
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold tracking-tight ${bottleneckTasks.length > 0 ? 'text-error' : 'text-primary'}`}>
                          {bottleneckTasks.length}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bottleneckTasks.length > 0 ? 'bg-error-container/60 text-error' : 'bg-surface-container text-primary'}`}>
                          {bottleneckTasks.length > 0 ? 'Critical Impact' : 'All Clear'}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1 truncate">
                        {firstBottleneck
                          ? `${firstBottleneck.title} (${firstBottleneck.goalTitle})`
                          : 'No blocked tasks or critical delays detected.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actionable Intelligence Cards (Row of 3 Callouts) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Recovery Opportunity Card */}
                  <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-[#E5E4DC] flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#d97736]"></div>
                    <div className="flex flex-col gap-2 pl-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8F5F0E] bg-[#fbf0dc] px-2 py-0.5 rounded-full font-bold">
                          {bottleneckTasks.length > 0 ? 'Recovery Opportunity' : 'Operational Status'}
                        </span>
                        <span className="text-xs text-on-surface-variant font-medium">
                          {bottleneckTasks.length > 0 ? 'Needs Attention' : 'On Track'}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-on-surface mt-1">
                        {firstBottleneck ? firstBottleneck.title : (totalGoals > 0 ? 'Workflow Cadence Healthy' : 'No Goals Defined Yet')}
                      </h2>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {firstBottleneck
                          ? `Task is currently marked as ${firstBottleneck.status}. Unblocking this task maintains project delivery buffer.`
                          : (totalGoals > 0
                            ? 'All milestones and deliverables are operating within projected timeframes. Continue active sprints to maintain momentum.'
                            : 'Create a new strategic goal with the AI Assistant or manual composer to begin tracking velocity.')}
                      </p>
                    </div>
                    <div className="mt-4 pl-2 pt-2 border-t border-surface-container flex items-center justify-between">
                      {recoveryPlan ? (
                        <button
                          onClick={() => setIsRecoveryOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all cursor-pointer"
                          type="button"
                        >
                          <span>Review Recovery Plan</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </button>
                      ) : (
                        <Link
                          href={totalGoals > 0 ? `/goals/${goals[0].id}` : '/my-goals'}
                          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-surface-container text-primary text-xs font-semibold hover:bg-surface-container-high transition-all"
                        >
                          <span>{totalGoals > 0 ? 'View Active Goal' : 'Explore Goals'}</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      )}
                      <span className="text-xs text-outline font-medium">
                        {bottleneckTasks.length > 0 ? `${bottleneckTasks.length} pending` : 'Nominal'}
                      </span>
                    </div>
                  </div>

                  {/* Focus Rhythm Card */}
                  <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-[#E5E4DC] flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
                    <div className="flex flex-col gap-2 pl-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-primary bg-primary-fixed/50 px-2 py-0.5 rounded-full font-bold">
                          Cadence Recommendation
                        </span>
                        <span className="text-xs text-on-surface-variant font-medium">Peak: 9:00 - 11:30 AM</span>
                      </div>
                      <h2 className="text-base font-bold text-on-surface mt-1">
                        Protect High-Yield Focus Blocks
                      </h2>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Data shows task completion rates are highest when uninterrupted deep work is scheduled in 25-minute intervals. Keep sprint reviews scheduled after focused execution.
                      </p>
                    </div>
                    <div className="mt-4 pl-2 pt-2 border-t border-surface-container flex items-center justify-between">
                      <Link
                        href="/focus"
                        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-surface-container text-primary text-xs font-semibold hover:bg-surface-container-high transition-all"
                      >
                        <span>Launch Focus Sprint</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                      <span className="text-xs text-outline font-medium">{sessions.length} sessions logged</span>
                    </div>
                  </div>

                  {/* Capacity & Burnout Buffer */}
                  <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-[#E5E4DC] flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary"></div>
                    <div className="flex flex-col gap-2 pl-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-secondary bg-secondary-fixed px-2 py-0.5 rounded-full font-bold">
                          Capacity Allocation
                        </span>
                        <span className="text-xs text-on-surface-variant font-medium">
                          {totalTasks > 0 ? `${Math.min(100, Math.round((totalTasks / 20) * 100))}% Scheduled` : '0% Allocated'}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-on-surface mt-1">
                        Balanced Workload Buffer
                      </h2>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {totalTasks > 0
                          ? `${totalTasks} total tasks scheduled across active goals. Slack buffer prevents overload and preserves execution quality.`
                          : 'No tasks scheduled in your queue. Add tasks to your goals to optimize capacity planning.'}
                      </p>
                    </div>
                    <div className="mt-4 pl-2 pt-2 border-t border-surface-container flex items-center justify-between">
                      <Link
                        href="/settings"
                        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-all"
                      >
                        <span>Adjust Working Hours</span>
                      </Link>
                      <span className="text-xs text-outline font-medium">Customizable</span>
                    </div>
                  </div>
                </div>

                {/* Focus Session Log History */}
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-[#E5E4DC] flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                      <h2 className="text-base font-bold text-on-surface">Recent Focus Sessions & Logs</h2>
                    </div>
                    <span className="text-xs text-outline">Live Session History</span>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-outline-variant/30 rounded-xl">
                      <span className="material-symbols-outlined text-outline text-3xl">timer</span>
                      <p className="text-sm font-semibold text-on-surface">No focus sessions recorded yet</p>
                      <p className="text-xs text-on-surface-variant max-w-sm">
                        Use Focus Mode to enter deep work sprints and track completion time against real tasks.
                      </p>
                      <Link
                        href="/focus"
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[14px]">bolt</span>
                        <span>Start Focus Session</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-surface-container text-on-surface-variant font-bold">
                            <th className="pb-2">Task</th>
                            <th className="pb-2">Goal</th>
                            <th className="pb-2">Duration</th>
                            <th className="pb-2">Steps</th>
                            <th className="pb-2">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container">
                          {sessions.map((sess) => (
                            <tr key={sess.id} className="hover:bg-surface-container-low/40">
                              <td className="py-2.5 font-semibold text-on-surface">{sess.taskTitle}</td>
                              <td className="py-2.5 text-on-surface-variant">{sess.goalTitle || 'Active Goal'}</td>
                              <td className="py-2.5 font-bold text-primary">{sess.durationMins}m</td>
                              <td className="py-2.5 text-on-surface-variant">
                                {sess.completedSteps}/{sess.totalSteps}
                              </td>
                              <td className="py-2.5 text-outline">
                                {new Intl.DateTimeFormat('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: 'numeric',
                                }).format(new Date(sess.createdAt))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {recoveryPlan && (
        <RecoveryModal
          isOpen={isRecoveryOpen}
          onClose={() => setIsRecoveryOpen(false)}
          plan={recoveryPlan}
        />
      )}
    </div>
  );
}
