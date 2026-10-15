'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Goal, Task } from '@/lib/types';
import { NewGoalModal } from '@/components/NewGoalModal';
import { loadGoalsCached, getCachedGoals, subscribeToStore } from '@/lib/client-store';

export default function FocusModePage() {
  const [goals, setGoals] = useState<Goal[]>(() => getCachedGoals() || []);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    const cached = getCachedGoals();
    if (cached) {
      const tasks = cached.flatMap((g) => (g.tasks || []).map((t) => ({ ...t, goalId: g.id, goalTitle: g.title })));
      const active = tasks.find((t) => t.isNextStep) || tasks.find((t) => t.status === 'READY' || t.status === 'IN_PROGRESS') || tasks[0];
      return active ? active.id : '';
    }
    return '';
  });
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [ambientSound, setAmbientSound] = useState('Rain & Forest');
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scratchpad, setScratchpad] = useState('');
  const [sessionCount, setSessionCount] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !getCachedGoals());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchGoals = async (force = false) => {
    try {
      const data = await loadGoalsCached(force);
      setGoals(data);
      const tasks = data.flatMap((g) => (g.tasks || []).map((t) => ({ ...t, goalId: g.id, goalTitle: g.title })));
      const active = tasks.find((t) => t.isNextStep) || tasks.find((t) => t.status === 'READY' || t.status === 'IN_PROGRESS') || tasks[0];
      if (active && !selectedTaskId) {
        setSelectedTaskId(active.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();

    return subscribeToStore(() => {
      const cached = getCachedGoals();
      if (cached) {
        setGoals(cached);
      }
    });
  }, []);

  const allTasks = goals.flatMap((g) =>
    (g.tasks || []).map((t) => ({ ...t, goalId: g.id, goalTitle: g.title }))
  );
  const currentTask = allTasks.find((t) => t.id === selectedTaskId) || allTasks[0];

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const handleToggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const handleAddFiveMinutes = () => {
    setSecondsLeft((prev) => prev + 300);
    setTotalSeconds((prev) => prev + 300);
    showToast('+5 minutes added to focus interval.');
  };

  const handleToggleChecklist = async (itemId: string, isDone: boolean) => {
    if (!currentTask) return;
    try {
      await fetch(`/api/tasks/${currentTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_checklist',
          itemId,
          isCompleted: !isDone,
        }),
      });
      fetchGoals();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkDone = async () => {
    if (!currentTask) return;
    setIsCompleted(true);
    setIsRunning(false);

    const durationMins = Math.round((totalSeconds - secondsLeft) / 60) || 25;

    try {
      await fetch('/api/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: currentTask.goalId,
          taskId: currentTask.id,
          taskTitle: currentTask.title,
          durationMins,
          completedSteps: (currentTask.checklist || []).filter((c) => c.isCompleted).length,
          totalSteps: (currentTask.checklist || []).length,
          intervalNumber: sessionCount,
          notes: scratchpad || undefined,
        }),
      });

      // Update task status to COMPLETED
      await fetch(`/api/tasks/${currentTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      setSessionCount((prev) => prev + 1);
      showToast('Focus session logged & task updated successfully!');
      fetchGoals();
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressRatio = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const circumference = 2 * Math.PI * 44;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased">
      <Sidebar onOpenNewGoal={() => setIsModalOpen(true)} />
      <div className="lg:pl-60">
        <Header />

        <main className="relative pt-16 bg-surface min-h-screen pb-16">
          <div className="flex flex-col w-full pb-16">
            {/* Top Breadcrumb Context Bar */}
            <div className="px-4 lg:px-8 pt-4 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-0">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Link
                  href="/my-goals"
                  className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-medium"
                >
                  <span className="material-symbols-outlined text-[15px]">flag</span>
                  Goals
                </Link>
                {currentTask && (
                  <>
                    <span className="text-outline">/</span>
                    <Link
                      href={`/goals/${currentTask.goalId}`}
                      className="text-on-surface-variant hover:text-primary transition-colors font-medium truncate max-w-[200px]"
                    >
                      {currentTask.goalTitle}
                    </Link>
                    <span className="text-outline">/</span>
                    <span className="text-on-surface font-bold bg-surface-container px-2.5 py-0.5 rounded-full truncate max-w-[200px]">
                      {currentTask.title}
                    </span>
                  </>
                )}
              </div>

              {allTasks.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-on-surface-variant font-medium">Switch Task:</span>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#E5E4DC] text-xs bg-white text-on-surface font-semibold max-w-[240px]"
                  >
                    {allTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.goalTitle})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-xs text-on-surface-variant">
                Loading focus session...
              </div>
            ) : !currentTask ? (
              <div className="max-w-2xl mx-auto mt-12 bg-surface-container-lowest rounded-2xl p-10 border border-[#E5E4DC] text-center flex flex-col items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#E7EFE8] text-[#315B46] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">center_focus_strong</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">No tasks ready for focus sprint</h3>
                  <p className="text-xs text-on-surface-variant max-w-md mt-1">
                    Create a strategic goal and add execution tasks in your workspace to run timed deep work intervals.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#315B46] text-white text-xs font-semibold hover:bg-[#284937] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Create First Goal</span>
                </button>
              </div>
            ) : (
              /* Main Content Grid */
              <div className="px-4 lg:px-8 pt-2 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-7xl mx-auto w-full">
                {/* Left & Center: Execution Canvas */}
                <section className="lg:col-span-8 flex flex-col gap-5">
                  {/* Timer Card */}
                  <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-xs border border-[#E5E4DC] relative overflow-hidden">
                    {/* Task Brief */}
                    <div className="flex flex-col gap-2 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-primary font-bold bg-primary-fixed/50 px-2.5 py-0.5 rounded-full">
                          Active Sprint Interval #{sessionCount}
                        </span>
                        <span className="text-xs text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-primary">alarm</span>
                          Est. Duration: ~{currentTask.estimatedMins || 25}m
                        </span>
                      </div>

                      <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                        {currentTask.title}
                      </h1>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {currentTask.description || 'Deep work interval dedicated to unblocking key milestones.'}
                      </p>
                    </div>

                    {/* Timer Dial Display */}
                    <div className="my-8 flex flex-col items-center justify-center relative">
                      <div className="relative w-56 h-56 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="44"
                            className="stroke-surface-container"
                            strokeWidth="3.5"
                            fill="transparent"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="44"
                            className="stroke-primary transition-all duration-1000 ease-linear"
                            strokeWidth="4"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl sm:text-5xl font-black text-on-surface tracking-tight font-mono">
                            {formatTime(secondsLeft)}
                          </span>
                          <span className="text-xs font-semibold text-primary uppercase tracking-wider mt-1">
                            {isRunning ? 'Focus Sprint' : secondsLeft === 0 ? 'Interval Done' : 'Paused'}
                          </span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-3 mt-6">
                        <button
                          type="button"
                          onClick={handleToggleTimer}
                          className="flex items-center gap-2 h-11 px-6 rounded-xl bg-primary-container text-on-primary text-xs font-semibold shadow-xs hover:bg-primary transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isRunning ? 'pause' : 'play_arrow'}
                          </span>
                          <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleResetTimer}
                          className="h-11 px-4 rounded-xl border border-[#E5E4DC] text-on-surface text-xs font-semibold hover:bg-surface-container transition-colors cursor-pointer"
                        >
                          Reset
                        </button>

                        <button
                          type="button"
                          onClick={handleAddFiveMinutes}
                          className="h-11 px-4 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
                        >
                          +5 mins
                        </button>
                      </div>
                    </div>

                    {/* Completion Action */}
                    <div className="pt-4 border-t border-[#E5E4DC] flex items-center justify-between">
                      <span className="text-xs text-on-surface-variant">Done with this sprint?</span>
                      <button
                        type="button"
                        onClick={handleMarkDone}
                        disabled={isCompleted}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#315B46] text-white text-xs font-semibold hover:bg-[#284937] transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>{isCompleted ? 'Logged & Completed' : 'Complete & Log Sprint'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Real Checklist Card */}
                  {currentTask.checklist && currentTask.checklist.length > 0 && (
                    <div className="bg-surface-container-lowest rounded-2xl p-5 border border-[#E5E4DC] shadow-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-[#E5E4DC]">
                        <span className="text-xs font-bold text-on-surface">Sub-task Checklist</span>
                        <span className="text-xs text-outline font-mono">
                          {currentTask.checklist.filter((c) => c.isCompleted).length}/{currentTask.checklist.length}
                        </span>
                      </div>
                      <div className="space-y-2 pt-3">
                        {currentTask.checklist.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={item.isCompleted}
                              onChange={() => handleToggleChecklist(item.id, item.isCompleted)}
                              className="mt-0.5 w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer"
                            />
                            <span
                              className={`text-xs ${
                                item.isCompleted
                                  ? 'line-through text-on-surface-variant'
                                  : 'text-on-surface font-medium'
                              }`}
                            >
                              {item.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Right Column: Scratchpad & Audio */}
                <section className="lg:col-span-4 flex flex-col gap-5">
                  <div className="bg-surface-container-lowest rounded-2xl p-5 border border-[#E5E4DC] shadow-xs flex flex-col gap-3">
                    <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">edit_note</span>
                      <span>Sprint Scratchpad</span>
                    </span>
                    <textarea
                      value={scratchpad}
                      onChange={(e) => setScratchpad(e.target.value)}
                      placeholder="Jot down quick thoughts, code snippets, or blockers..."
                      rows={8}
                      className="w-full p-3 border border-[#E5E4DC] rounded-xl text-xs bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono leading-relaxed resize-none"
                    />
                  </div>

                  <div className="bg-surface-container-lowest rounded-2xl p-5 border border-[#E5E4DC] shadow-xs flex flex-col gap-3">
                    <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">headphones</span>
                      <span>Ambient Sound</span>
                    </span>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                      <span className="text-xs font-semibold text-on-surface">{ambientSound}</span>
                      <button
                        type="button"
                        onClick={() => setSoundPlaying(!soundPlaying)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                          soundPlaying ? 'bg-primary text-white' : 'bg-surface-container text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {soundPlaying ? 'volume_up' : 'volume_off'}
                        </span>
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-[#315B46] text-white text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <NewGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGoalCreated={() => fetchGoals()}
      />
    </div>
  );
}
