'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { NewGoalModal } from '@/components/NewGoalModal';
import { Goal } from '@/lib/types';

import {
  loadGoalsCached,
  loadUserCached,
  getCachedGoals,
  subscribeToStore,
  addCachedGoal,
} from '@/lib/client-store';

export default function HomePage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>(() => getCachedGoals() || []);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(() => !getCachedGoals());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inlinePrompt, setInlinePrompt] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [recommendedSnoozed, setRecommendedSnoozed] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState('');

  const fetchGoals = async (force = false) => {
    try {
      const data = await loadGoalsCached(force);
      setGoals(data);
    } catch (e) {
      console.error('Failed to load goals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentDateStr(
      new Intl.DateTimeFormat('en-IN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Kolkata',
      }).format(new Date())
    );

    loadUserCached().then((user) => {
      if (user) setCurrentUser(user);
    });

    fetchGoals();

    return subscribeToStore(() => {
      const cached = getCachedGoals();
      if (cached) setGoals(cached);
    });
  }, []);

  const handleInlineCreate = async () => {
    if (!inlinePrompt.trim()) return;
    setIsSynthesizing(true);
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalTitle: inlinePrompt }),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const proposal = await res.json();
        // Save the proposal directly
        const saveRes = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(proposal),
        });
        if (saveRes.status === 401) {
          router.push('/login');
          return;
        }
        if (saveRes.ok) {
          const newGoal = await saveRes.json();
          setInlinePrompt('');
          fetchGoals();
          router.push(`/goals/${newGoal.id}`);
        }
      }
    } catch (e) {
      console.error('Error synthesizing plan:', e);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const suggestions = [
    'Launch iOS beta in 6 weeks',
    'Prepare Series A pitch deck',
    'Run a half-marathon by spring',
    'Redesign onboarding funnel',
  ];

  const allTasks = goals.flatMap((g) =>
    (g.tasks || []).map((t) => ({ ...t, goalTitle: g.title, goalId: g.id }))
  );
  const recommendedTask =
    allTasks.find((t) => t.isNextStep) ||
    allTasks.find((t) => t.status === 'READY' || t.status === 'IN_PROGRESS');

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased">
      <Sidebar onOpenNewGoal={() => setIsModalOpen(true)} />
      <div className="lg:pl-60">
        <Header />

        <main className="relative pt-16 lg:pt-16 bg-surface min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col w-full gap-8">
              {/* Top Greeting & Pulse Section */}
              <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h1 className="text-3xl sm:text-4xl font-bold text-on-surface tracking-tight">
                    Welcome back{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}
                  </h1>
                  <p className="text-sm text-on-surface-variant flex items-center gap-2 flex-wrap font-medium">
                    <span>{currentDateStr || 'Today'}</span>
                    <span>•</span>
                    <span className="text-primary font-semibold">{goals.length} active goals</span>
                    <span>•</span>
                    {goals.some((g) => g.status === 'AT_RISK') ? (
                      <span className="text-error font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        {goals.filter((g) => g.status === 'AT_RISK').length} deadline at risk
                      </span>
                    ) : (
                      <span className="text-primary font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        {goals.length > 0 ? 'All roadmaps healthy' : 'Ready to plan'}
                      </span>
                    )}
                  </p>
                </div>
                {goals.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/goals/${goals[0].id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low text-primary text-xs font-semibold hover:bg-surface-container transition-colors shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      <span>Target: {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(goals[0].targetDate))}</span>
                    </Link>
                  </div>
                )}
              </section>

              {/* Hero Goal Input (Conversational Composer) */}
              <section className="relative">
                <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col gap-4 border border-[#E5E4DC]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                      <span>Adaptive Goal Engine</span>
                    </div>
                    <span className="text-xs text-outline hidden sm:inline-block">
                      Intelligent Roadmap Synthesis
                    </span>
                  </div>

                  {/* Input Bar */}
                  <div className="relative flex items-center bg-surface-container-low rounded-xl p-1.5 transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/20">
                    <span className="material-symbols-outlined text-outline ml-3 text-[22px]">explore</span>
                    <input
                      className="w-full bg-transparent border-0 px-3 py-2 text-base text-on-surface placeholder:text-outline focus:outline-none"
                      placeholder="What would you like to accomplish?"
                      type="text"
                      value={inlinePrompt}
                      onChange={(e) => setInlinePrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleInlineCreate();
                      }}
                    />
                    <button
                      className="shrink-0 flex items-center gap-2 h-10 px-5 rounded-lg bg-primary-container text-on-primary text-sm font-semibold shadow-xs hover:bg-primary transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      onClick={handleInlineCreate}
                      disabled={isSynthesizing || !inlinePrompt.trim()}
                      type="button"
                    >
                      {isSynthesizing ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                          <span>Synthesizing...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                          <span>Create plan</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                    <span className="text-xs text-on-surface-variant font-medium shrink-0">Try exploring:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {suggestions.map((text) => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => {
                            setInlinePrompt(text);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-variant hover:text-primary transition-colors cursor-pointer"
                        >
                          <span>{text}</span>
                          <span className="material-symbols-outlined text-[13px] text-outline">arrow_forward</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Today's Recommended Task Banner */}
              <section>
                {recommendedTask ? (
                  recommendedSnoozed ? (
                    <div className="px-4 py-3 rounded-xl bg-surface-container-low border border-surface-container text-xs text-on-surface-variant flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
                        <span>Next step snoozed until your next focus interval.</span>
                      </span>
                      <button
                        onClick={() => setRecommendedSnoozed(false)}
                        className="text-primary font-semibold hover:underline cursor-pointer"
                      >
                        Restore
                      </button>
                    </div>
                  ) : (
                    <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden border border-[#E5E4DC]">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container"></div>
                      <div className="flex items-start gap-4 pl-2 sm:pl-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center shrink-0 mt-0.5 text-primary">
                          <span className="material-symbols-outlined text-[20px]">bolt</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-primary tracking-wide uppercase font-bold">
                              Recommended Next Step
                            </span>
                            <span className="text-outline text-xs">•</span>
                            <span className="text-[11px] text-primary bg-surface-container text-primary px-2 py-0.5 rounded-full font-semibold">
                              {recommendedTask.priority} Priority
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-on-surface">
                            {recommendedTask.title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant text-xs">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-primary">flag</span>
                              <span>{recommendedTask.goalTitle}</span>
                            </span>
                            <span>•</span>
                            <span className="text-on-surface font-semibold">{recommendedTask.description || 'Execution step'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-outline">
                              <span className="material-symbols-outlined text-[16px]">schedule</span>
                              <span>Est. {recommendedTask.estimatedMins} mins</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-2 sm:pl-3 md:pl-0 w-full md:w-auto justify-end">
                        <button
                          onClick={() => setRecommendedSnoozed(true)}
                          className="h-10 px-4 rounded-lg bg-surface-container-low text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors flex items-center justify-center cursor-pointer"
                          type="button"
                        >
                          Later
                        </button>
                        <Link
                          href={`/goals/${recommendedTask.goalId}`}
                          className="h-10 px-4 rounded-lg bg-surface-container text-primary text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center justify-center"
                        >
                          Workspace
                        </Link>
                        <Link
                          href="/focus"
                          className="flex items-center gap-1.5 h-10 px-5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold shadow-xs hover:bg-primary transition-all active:scale-[0.98]"
                        >
                          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                          <span>Start in Focus Mode</span>
                        </Link>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="bg-surface-container-lowest rounded-2xl p-6 border border-[#E5E4DC] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E7EFE8] text-[#315B46] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">Welcome to your adaptive workspace</h3>
                        <p className="text-xs text-on-surface-variant">Type any goal above or click &quot;+ New Goal&quot; to synthesize an adaptive execution plan.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#315B46] text-white text-xs font-semibold hover:bg-[#284937] transition-colors shrink-0"
                    >
                      + Create First Goal
                    </button>
                  </div>
                )}
              </section>

              {/* Active Goals Grid */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-on-surface">Active Goals</h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-primary">
                      {goals.length} Active
                    </span>
                  </div>
                  <Link
                    href="/my-goals"
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-container transition-colors"
                  >
                    <span>View all roadmaps</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </Link>
                </div>

                {goals.length === 0 ? (
                  <div className="bg-surface-container-lowest rounded-2xl p-8 border border-[#E5E4DC] text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#E7EFE8] text-[#315B46] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px]">flag</span>
                    </div>
                    <h3 className="text-base font-bold text-on-surface">No goals yet</h3>
                    <p className="text-xs text-on-surface-variant max-w-md">
                      Your workspace is ready. Type a prompt above or use the button below to generate your first execution roadmap.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#315B46] text-white text-xs font-semibold hover:bg-[#284937] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>Create Your First Goal</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {goals.map((g) => {
                    const isAtRisk = g.status === 'AT_RISK';
                    const isAhead = g.status === 'AHEAD';
                    const isCompleted = g.status === 'COMPLETED';

                    return (
                      <div
                        key={g.id}
                        className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-5 border border-[#E5E4DC] group"
                      >
                        <div className="flex flex-col gap-4">
                          {/* Top Tag & Date */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold ${
                                isAtRisk
                                  ? 'bg-error-container/40 text-error'
                                  : isAhead
                                  ? 'bg-primary-fixed text-primary'
                                  : isCompleted
                                  ? 'bg-primary text-on-primary'
                                  : 'bg-secondary-fixed text-on-secondary-fixed'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isAtRisk
                                    ? 'bg-error'
                                    : isAhead
                                    ? 'bg-primary'
                                    : isCompleted
                                    ? 'bg-white'
                                    : 'bg-secondary'
                                }`}
                              ></span>
                              <span>
                                {isAtRisk
                                  ? 'Deadline at Risk'
                                  : isAhead
                                  ? 'Ahead of Schedule'
                                  : isCompleted
                                  ? 'Completed'
                                  : 'In Progress'}
                              </span>
                            </span>

                            <div className="flex items-center text-outline text-xs font-medium">
                              <span className="material-symbols-outlined text-[16px] mr-1">event</span>
                              <span>
                                {new Intl.DateTimeFormat('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                }).format(new Date(g.targetDate))}
                              </span>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <Link
                                href={`/goals/${g.id}`}
                                className="text-base font-bold text-on-surface group-hover:text-primary transition-colors"
                              >
                                {g.title}
                              </Link>
                              <Link href={`/goals/${g.id}`} className="text-outline hover:text-primary">
                                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                              </Link>
                            </div>
                            <p className="text-xs text-on-surface-variant line-clamp-2">{g.description}</p>
                          </div>

                          {/* Progress Bar */}
                          <div className="flex flex-col gap-1.5 pt-1">
                            <div className="flex justify-between items-baseline text-xs">
                              <span className="text-on-surface-variant font-medium">Progress</span>
                              <span className="font-bold text-primary">{Math.round(g.progress)}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary-container transition-all duration-500"
                                style={{ width: `${Math.round(g.progress)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Preview Box */}
                        <div className="flex flex-col gap-2 pt-1 border-t border-surface-container">
                          <div className="flex items-center justify-between text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <span className="material-symbols-outlined text-[15px]">task_alt</span>
                              <span>
                                {g.tasks ? `${g.tasks.filter((t) => t.status === 'COMPLETED').length}/${g.tasks.length} tasks` : 'Active'}
                              </span>
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (confirm(`Are you sure you want to delete "${g.title}"?`)) {
                                    await fetch(`/api/goals/${g.id}`, { method: 'DELETE' });
                                    fetchGoals();
                                  }
                                }}
                                className="text-outline hover:text-error transition-colors p-1 rounded hover:bg-error-container/20 cursor-pointer"
                                title="Delete goal"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                              <Link
                                href={`/goals/${g.id}`}
                                className="text-primary hover:underline text-xs font-semibold"
                              >
                                Open workspace →
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

              {/* Upcoming Deadlines & Milestone Health */}
              <section className="bg-surface-container-lowest rounded-2xl shadow-xs p-5 sm:p-6 flex flex-col gap-4 border border-[#E5E4DC]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">checklist</span>
                    <h2 className="text-base font-bold text-on-surface">Upcoming Deadlines & Milestone Health</h2>
                  </div>
                  <Link href="/dependency-map" className="text-xs font-semibold text-primary hover:underline">
                    View full schedule →
                  </Link>
                </div>

                {goals.flatMap((g) => (g.tasks || []).map((t) => ({ ...t, goalTitle: g.title }))).length === 0 ? (
                  <div className="py-6 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[24px] text-outline">event_available</span>
                    <span className="font-semibold text-on-surface">No upcoming milestone deadlines</span>
                    <span>Add tasks with due dates to active goals to track scheduled delivery.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {goals
                      .flatMap((g) => (g.tasks || []).map((t) => ({ ...t, goalTitle: g.title })))
                      .slice(0, 3)
                      .map((task) => (
                        <div key={task.id} className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-2 border border-[#E5E4DC]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-primary font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                              {task.dueDate
                                ? `Due ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(task.dueDate))}`
                                : 'Active Sprint'}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                task.priority === 'HIGH' || task.priority === 'URGENT'
                                  ? 'bg-error-container/40 text-on-error-container'
                                  : 'bg-primary-fixed text-primary'
                              }`}
                            >
                              {task.priority || 'Normal'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-on-surface truncate">{task.title}</p>
                          <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-1">
                            <span className="truncate">{task.goalTitle}</span>
                            <span className="font-semibold text-primary">{task.status}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* New Goal Modal Dialog */}
      <NewGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGoalCreated={(goal) => {
          fetchGoals();
          router.push(`/goals/${goal.id}`);
        }}
      />
    </div>
  );
}
