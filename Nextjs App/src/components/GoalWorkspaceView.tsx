'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { RecoveryModal } from '@/components/RecoveryModal';
import { Goal, Task } from '@/lib/types';
import { getCachedGoals, addCachedGoal } from '@/lib/client-store';

interface GoalWorkspaceViewProps {
  goalId: string;
}

export function GoalWorkspaceView({ goalId }: GoalWorkspaceViewProps) {
  const [goal, setGoal] = useState<Goal | null>(() => {
    return getCachedGoals()?.find((g) => g.id === goalId) || null;
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(() => {
    const cached = getCachedGoals()?.find((g) => g.id === goalId);
    if (cached?.tasks && cached.tasks.length > 0) {
      return cached.tasks.find((t) => t.isNextStep) || cached.tasks[0];
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TASKS' | 'DEPENDENCY_MAP' | 'ACTIVITY'>('TASKS');
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [loading, setLoading] = useState(() => !getCachedGoals()?.find((g) => g.id === goalId));

  const fetchGoal = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/goals/${goalId}`);
      if (res.ok) {
        const data: Goal = await res.json();
        setGoal(data);
        const tasks = data.tasks || [];
        if (tasks.length > 0) {
          setSelectedTask((prev) => {
            if (prev) {
              const matched = tasks.find((t) => t.id === prev.id);
              if (matched) return matched;
            }
            return tasks.find((t) => t.isNextStep) || tasks[0];
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'READY' : 'COMPLETED';

    // 1. Instant 0ms Optimistic UI update
    setGoal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: (prev.tasks || []).map((t) => (t.id === task.id ? { ...t, status: newStatus as any } : t)),
      };
    });
    if (selectedTask?.id === task.id) {
      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus as any } : null));
    }

    // 2. Persist in background
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (selectedTask?.id === task.id) {
          setSelectedTask(updated);
        }
      } else {
        fetchGoal();
      }
    } catch (e) {
      console.error(e);
      fetchGoal();
    }
  };

  const handleToggleChecklist = async (taskId: string, itemId: string, isCompleted: boolean) => {
    const nextCompleted = !isCompleted;

    // 1. Instant 0ms Optimistic UI update
    setGoal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: (prev.tasks || []).map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            checklist: (t.checklist || []).map((c) =>
              c.id === itemId ? { ...c, isCompleted: nextCompleted } : c
            ),
          };
        }),
      };
    });

    if (selectedTask?.id === taskId && selectedTask.checklist) {
      setSelectedTask((prev) => {
        if (!prev || !prev.checklist) return prev;
        return {
          ...prev,
          checklist: prev.checklist.map((c) =>
            c.id === itemId ? { ...c, isCompleted: nextCompleted } : c
          ),
        };
      });
    }

    // 2. Persist in background
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_checklist',
          itemId,
          isCompleted: nextCompleted,
        }),
      });
      if (!res.ok) {
        fetchGoal();
      }
    } catch (e) {
      console.error(e);
      fetchGoal();
    }
  };

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskEstMins, setNewTaskEstMins] = useState(45);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  // Target date adjustment state
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [targetDateInput, setTargetDateInput] = useState('');
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);

  useEffect(() => {
    if (goal?.targetDate) {
      setTargetDateInput(new Date(goal.targetDate).toISOString().split('T')[0]);
    }
  }, [goal?.targetDate]);

  const handleSaveTargetDate = async () => {
    if (!targetDateInput) return;
    setIsUpdatingDate(true);
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate: new Date(targetDateInput).toISOString() }),
      });
      if (res.ok) {
        const updated: Goal = await res.json();
        setGoal(updated);
        addCachedGoal(updated);
        setIsDateModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to update target date:', err);
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const handleDeleteGoal = async () => {
    if (confirm(`Are you sure you want to delete goal "${goal?.title}"? All associated milestones and tasks will be removed.`)) {
      await fetch(`/api/goals/${goalId}`, { method: 'DELETE' });
      window.location.href = '/my-goals';
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId,
          title: newTaskTitle.trim(),
          milestoneId: newTaskMilestoneId || goal?.milestones?.[0]?.id,
          priority: newTaskPriority,
          estimatedMins: Number(newTaskEstMins) || 45,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setNewTaskTitle('');
        setIsAddTaskOpen(false);
        await fetchGoal();
        setSelectedTask(created);
      }
    } catch (e) {
      console.error('Failed to create task:', e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Delete this task?')) {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        if (res.ok) {
          if (selectedTask?.id === taskId) {
            setSelectedTask(null);
          }
          fetchGoal();
        }
      } catch (e) {
        console.error('Failed to delete task:', e);
      }
    }
  };

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !newChecklistTitle.trim()) return;

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_checklist',
          title: newChecklistTitle.trim(),
        }),
      });

      if (res.ok) {
        const item = await res.json();
        setNewChecklistTitle('');
        setSelectedTask({
          ...selectedTask,
          checklist: [...(selectedTask.checklist || []), item],
        });
        fetchGoal();
      }
    } catch (e) {
      console.error('Failed to add checklist item:', e);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!selectedTask) return;
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_checklist',
          itemId,
        }),
      });

      if (res.ok) {
        setSelectedTask({
          ...selectedTask,
          checklist: (selectedTask.checklist || []).filter((c) => c.id !== itemId),
        });
        fetchGoal();
      }
    } catch (e) {
      console.error('Failed to delete checklist item:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-on-surface-variant text-sm">
        Loading workspace...
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 text-on-surface">
        <p className="text-base font-semibold">Goal not found</p>
        <Link href="/my-goals" className="px-4 py-2 bg-primary-container text-on-primary rounded-lg text-xs font-semibold">
          Return to Goals
        </Link>
      </div>
    );
  }

  const milestones = goal.milestones || [];
  const tasks = goal.tasks || [];
  const recoveryPlan = goal.recoveryPlans && goal.recoveryPlans[0];

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased">
      <Sidebar />
      <div className="lg:pl-60">
        <Header />

        <main className="relative pt-16 bg-surface min-h-screen pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col w-full">
              {/* Top Breadcrumb & Alerts Bar */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs font-semibold">
                    <Link href="/my-goals" className="hover:text-primary transition-colors">
                      Goals
                    </Link>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span className="text-on-surface font-bold">{goal.title}</span>
                  </nav>

                  {/* Alert Notice Pill */}
                  {goal.status === 'AT_RISK' && (
                    <div
                      onClick={() => setIsRecoveryOpen(true)}
                      className="flex items-center gap-1.5 bg-surface-container-high px-3 py-1 rounded-full text-on-surface text-xs font-medium shadow-xs cursor-pointer hover:bg-surface-variant transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-error">warning</span>
                      <span>Schedule notice: 1 milestone delayed</span>
                      <span className="text-outline">·</span>
                      <span className="text-primary font-bold hover:underline">View Recovery Plan</span>
                    </div>
                  )}
                </div>

                {/* Project Header Block */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 pb-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                        {goal.title}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-xs text-on-surface-variant font-semibold">
                        {goal.category}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-fixed/60 text-xs text-primary font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {goal.status === 'AT_RISK'
                          ? 'At Risk (Recovery Available)'
                          : goal.status === 'COMPLETED'
                          ? 'Completed (100%)'
                          : `On Track (${Math.round(goal.progress)}%)`}
                      </span>
                    </div>

                    {/* Metadata Summary */}
                    <div className="flex items-center gap-4 sm:gap-6 text-on-surface-variant text-xs flex-wrap pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
                        <span>
                          Target: <strong className="text-on-surface font-semibold">{new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(goal.targetDate))}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetDateInput(new Date(goal.targetDate).toISOString().split('T')[0]);
                            setIsDateModalOpen(true);
                          }}
                          className="ml-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-container px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
                          title="Adjust goal deadline and rebalance roadmap"
                        >
                          <span className="material-symbols-outlined text-[13px]">edit_calendar</span>
                          <span>Adjust Date</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-outline">timelapse</span>
                        <span>
                          Effort: <strong className="text-on-surface font-semibold">{goal.effortSpentHours}h</strong> /{' '}
                          {goal.effortAllocatedHours}h allocated
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-outline">task_alt</span>
                        <span>
                          Tasks: <strong className="text-on-surface font-semibold">{goal.tasks?.length || 0} total</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleDeleteGoal}
                      className="flex items-center gap-1.5 h-10 px-3.5 rounded-lg border border-error/30 text-error font-semibold text-xs hover:bg-error-container/20 transition-all cursor-pointer"
                      type="button"
                      title="Delete this entire goal"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      <span>Delete Goal</span>
                    </button>
                    {goal.status === 'AT_RISK' && (
                      <button
                        onClick={() => setIsRecoveryOpen(true)}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-surface-container-lowest text-error font-semibold text-xs shadow-xs border border-error/20 hover:bg-error-container/20 transition-all cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                        <span>Recovery Plan</span>
                      </button>
                    )}
                    <Link
                      href="/focus"
                      className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary-container text-on-primary font-semibold text-xs shadow-xs hover:bg-primary transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
                      <span>Focus Mode</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Workspace Navigation Tabs */}
              <div className="flex items-center gap-2 mb-6 bg-surface-container-low p-1.5 rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('OVERVIEW')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === 'OVERVIEW'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('TASKS')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'TASKS'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span>Tasks</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                </button>
                <Link
                  href="/dependency-map"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap"
                >
                  Dependency Map
                </Link>
                <Link
                  href="/insights"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Activity
                </Link>
              </div>

              {/* Main Split Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Milestones & Dynamic Task List */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  {/* Task Management Bar */}
                  <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-2xl border border-[#E5E4DC]">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-on-surface">Execution Tasks</span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-xs font-semibold text-primary">
                        {tasks.length} total
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddTaskOpen(!isAddTaskOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>{isAddTaskOpen ? 'Cancel' : 'Add Task'}</span>
                    </button>
                  </div>

                  {/* Inline Task Creator Form */}
                  {isAddTaskOpen && (
                    <form
                      onSubmit={handleCreateTask}
                      className="bg-surface-container-lowest p-4 rounded-2xl border border-[#315B46] shadow-sm flex flex-col gap-3"
                    >
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Create New Task</h3>
                      <input
                        type="text"
                        placeholder="Task title (e.g. Design app onboarding flow)"
                        required
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E5E4DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-on-surface"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Milestone</label>
                          <select
                            value={newTaskMilestoneId}
                            onChange={(e) => setNewTaskMilestoneId(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[#E5E4DC] rounded-lg text-xs bg-white text-on-surface"
                          >
                            {milestones.map((ms) => (
                              <option key={ms.id} value={ms.id}>
                                {ms.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Priority</label>
                          <select
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[#E5E4DC] rounded-lg text-xs bg-white text-on-surface"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">Est. Minutes</label>
                          <input
                            type="number"
                            min="5"
                            step="5"
                            value={newTaskEstMins}
                            onChange={(e) => setNewTaskEstMins(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 border border-[#E5E4DC] rounded-lg text-xs bg-white text-on-surface"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddTaskOpen(false)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors cursor-pointer"
                        >
                          Save Task
                        </button>
                      </div>
                    </form>
                  )}

                  {milestones.map((ms) => {
                    const msTasks = tasks.filter((t) => t.milestoneId === ms.id);
                    const isCompleted = ms.status === 'COMPLETED';

                    return (
                      <div
                        key={ms.id}
                        className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-[#E5E4DC] flex flex-col gap-3"
                      >
                        {/* Milestone Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isCompleted
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-surface-container text-primary'
                              }`}
                            >
                              {isCompleted ? (
                                <span className="material-symbols-outlined text-[14px]">check</span>
                              ) : (
                                ms.phaseNumber
                              )}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-on-surface">{ms.title}</span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isCompleted
                                      ? 'bg-primary-fixed text-primary'
                                      : 'bg-[#E5A83B]/20 text-[#8F5F0E]'
                                  }`}
                                >
                                  {isCompleted ? '100%' : `${ms.progress}% in progress`}
                                </span>
                              </div>
                              {ms.description && (
                                <p className="text-xs text-secondary mt-0.5">{ms.description}</p>
                              )}
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-outline text-[20px]">
                            {isCompleted ? 'expand_more' : 'expand_less'}
                          </span>
                        </div>

                        {/* Milestone Tasks */}
                        {msTasks.length > 0 && (
                          <div className="flex flex-col gap-2 pt-1">
                            {msTasks.map((t) => {
                              const isTaskCompleted = t.status === 'COMPLETED';
                              const isSelected = selectedTask?.id === t.id;
                              const isBlocked = t.status === 'BLOCKED';

                              return (
                                <div
                                  key={t.id}
                                  onClick={() => setSelectedTask(t)}
                                  className={`relative flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-surface-container-high/90 shadow-xs ring-1 ring-primary/30'
                                      : isBlocked
                                      ? 'bg-error-container/20 hover:bg-error-container/30'
                                      : 'bg-surface-container-low/50 hover:bg-surface-container-low'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r"></div>
                                  )}

                                  <div className="flex items-center gap-3 min-w-0 pl-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleTaskStatus(t);
                                      }}
                                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                        isTaskCompleted
                                          ? 'bg-primary text-on-primary'
                                          : 'border-2 border-outline/50 hover:border-primary'
                                      }`}
                                    >
                                      {isTaskCompleted && (
                                        <span className="material-symbols-outlined text-[14px]">check</span>
                                      )}
                                    </button>

                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`text-xs font-semibold truncate ${
                                            isTaskCompleted
                                              ? 'line-through text-on-surface-variant'
                                              : 'text-on-surface'
                                          }`}
                                        >
                                          {t.title}
                                        </span>
                                        {t.isNextStep && (
                                          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-primary text-[10px] font-bold">
                                            <span className="material-symbols-outlined text-[12px]">bolt</span>
                                            Next step
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-secondary truncate">
                                        {t.description || 'Deliverable'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <span className="text-[11px] text-secondary font-medium">
                                      {Math.round(t.estimatedMins / 60)}h
                                    </span>
                                    {isBlocked ? (
                                      <span className="px-2 py-0.5 rounded-full bg-error-container text-error text-[10px] font-bold">
                                        Blocked
                                      </span>
                                    ) : (
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          t.priority === 'HIGH' || t.priority === 'URGENT'
                                            ? 'bg-error-container text-error'
                                            : 'bg-surface-container text-secondary'
                                        }`}
                                      >
                                        {t.priority}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTask(t.id);
                                      }}
                                      className="text-outline hover:text-error p-1 rounded hover:bg-error-container/20 transition-colors cursor-pointer"
                                      title="Delete task"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">delete</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Circular Progress & Velocity Tile */}
                  <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-[#E5E4DC] flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-surface-container"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                          ></path>
                          <path
                            className="text-primary"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeDasharray="68, 100"
                            strokeLinecap="round"
                            strokeWidth="3.5"
                          ></path>
                        </svg>
                        <span className="absolute text-xs font-bold text-primary">68%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-on-surface">Sprint Velocity: 24 pts / week</span>
                        <span className="text-[11px] text-secondary">
                          Estimated completion remains securely on schedule for Nov 15
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>Zero regression tests failed</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Docked Task Details Panel */}
                <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-5 shadow-xs border border-[#E5E4DC] flex flex-col gap-4 sticky top-20">
                  {selectedTask ? (
                    <>
                      {/* Panel Header */}
                      <div className="flex flex-col gap-2 pb-2 border-b border-surface-container">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                selectedTask.status === 'COMPLETED'
                                  ? 'bg-primary-fixed text-primary'
                                  : 'bg-[#E5A83B]/20 text-[#8F5F0E]'
                              }`}
                            >
                              {selectedTask.status}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-error-container text-error text-[10px] font-bold">
                              {selectedTask.priority} Priority
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-outline">
                            <button className="p-1 hover:text-on-surface rounded-md hover:bg-surface-container">
                              <span className="material-symbols-outlined text-[18px]">share</span>
                            </button>
                          </div>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                          {selectedTask.title}
                        </h2>
                      </div>

                      {/* Primary CTA: Open in Focus Mode */}
                      <Link
                        href="/focus"
                        className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary-container text-on-primary text-xs font-semibold shadow-xs hover:bg-primary active:scale-[0.99] transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
                        <span>Open in Focus Mode</span>
                      </Link>

                      {/* Description */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                          Description
                        </span>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {selectedTask.description || 'No additional description provided.'}
                        </p>
                      </div>

                      {/* Assignee Card */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary font-bold flex items-center justify-center text-xs">
                            {(selectedTask.assignee?.name || selectedTask.assigneeName)
                              ? (selectedTask.assignee?.name || selectedTask.assigneeName || '')
                                  .split(' ')
                                  .map((n: string) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()
                              : 'TS'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-on-surface">
                              {selectedTask.assignee?.name || selectedTask.assigneeName || 'Workspace Assignee'}
                            </span>
                            <span className="text-[11px] text-secondary">
                              {selectedTask.assignee?.role || selectedTask.assigneeRole || 'Team Member'}
                            </span>
                          </div>
                        </div>
                        <span className="text-primary text-xs font-semibold">Assigned</span>
                      </div>

                      {/* Checklist */}
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                            Checklist (
                            {(selectedTask.checklist || []).filter((c) => c.isCompleted).length}/
                            {(selectedTask.checklist || []).length})
                          </span>
                        </div>
                        {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                          <div className="space-y-1.5">
                            {selectedTask.checklist.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors select-none"
                              >
                                <label className="flex items-start gap-2.5 flex-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.isCompleted}
                                    onChange={() =>
                                      handleToggleChecklist(selectedTask.id, item.id, item.isCompleted)
                                    }
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
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChecklistItem(item.id)}
                                  className="text-outline hover:text-error p-1 rounded transition-colors"
                                  title="Remove item"
                                >
                                  <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Inline Add Checklist Item */}
                        <form onSubmit={handleAddChecklistItem} className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add checklist step..."
                            value={newChecklistTitle}
                            onChange={(e) => setNewChecklistTitle(e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs border border-[#E5E4DC] rounded-lg bg-white text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="submit"
                            disabled={!newChecklistTitle.trim()}
                            className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold disabled:opacity-50 hover:bg-primary transition-colors cursor-pointer shrink-0"
                          >
                            Add
                          </button>
                        </form>
                      </div>

                      {/* Duration & Due Date */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1">
                          <span className="text-[10px] text-secondary uppercase font-bold">Estimated Duration</span>
                          <div className="flex items-center gap-1.5 text-xs text-on-surface font-bold">
                            <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                            <span>{Math.round(selectedTask.estimatedMins / 60) || 1} hrs</span>
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1">
                          <span className="text-[10px] text-secondary uppercase font-bold">Due Date</span>
                          <div className="flex items-center gap-1.5 text-xs text-on-surface font-bold">
                            <span className="material-symbols-outlined text-[16px] text-primary">event_upcoming</span>
                            <span>
                              {selectedTask.dueDate
                                ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(selectedTask.dueDate))
                                : 'Flexible'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delete Task Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(selectedTask.id)}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-error/30 text-error hover:bg-error-container/20 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span>Delete Task</span>
                      </button>
                    </>
                  ) : (
                    <div className="p-8 text-center text-xs text-outline">Select a task to inspect details.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Recovery Plan Dialog */}
      {recoveryPlan && (
        <RecoveryModal
          isOpen={isRecoveryOpen}
          onClose={() => setIsRecoveryOpen(false)}
          plan={recoveryPlan}
          onPlanApplied={() => {
            fetchGoal();
          }}
        />
      )}

      {/* Adjust Goal Deadline & Rebalance Roadmap Modal */}
      {isDateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl border border-[#E5E4DC] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 w-full bg-primary-container"></div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
                  <h3 className="text-sm font-bold text-on-surface">Adjust Goal Completion Date</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDateModalOpen(false)}
                  className="p-1 rounded-full text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                Updating the target date automatically recalibrates milestone deadlines, burn rates, and schedule health across your workspace.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">New Target Completion Date</label>
                <input
                  type="date"
                  value={targetDateInput}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setTargetDateInput(e.target.value)}
                  className="h-10 px-3 rounded-lg bg-surface-container-low border border-[#E5E4DC] text-xs text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                />
              </div>

              {targetDateInput && (
                <div className="p-3 rounded-xl bg-surface-container-low text-xs flex items-center justify-between">
                  <span className="text-on-surface-variant">Timeframe:</span>
                  <span className="font-bold text-primary">
                    {Math.max(1, Math.round((new Date(targetDateInput).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)))} weeks remaining
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDateModalOpen(false)}
                  className="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTargetDate}
                  disabled={isUpdatingDate || !targetDateInput}
                  className="h-9 px-5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingDate ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      <span>Rebalancing...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      <span>Save & Rebalance</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
