'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { NewGoalModal } from '@/components/NewGoalModal';
import { Goal } from '@/lib/types';
import { loadGoalsCached, getCachedGoals, subscribeToStore, setCachedGoals } from '@/lib/client-store';

export default function MyGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>(() => getCachedGoals() || []);
  const [filter, setFilter] = useState<'ALL' | 'AT_RISK' | 'ON_TRACK' | 'AHEAD' | 'COMPLETED'>('ALL');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(() => !getCachedGoals());

  const fetchGoals = async (force = false) => {
    try {
      const data = await loadGoalsCached(force);
      setGoals(data);
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
      if (cached) setGoals(cached);
    });
  }, []);

  const filteredGoals = goals.filter((g) => {
    const matchesFilter = filter === 'ALL' || g.status === filter;
    const matchesSearch =
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased">
      <Sidebar onOpenNewGoal={() => setIsModalOpen(true)} />
      <div className="lg:pl-60">
        <Header onSearch={setSearch} />

        <main className="relative pt-16 bg-surface min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col w-full gap-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">My Goals</h1>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Manage active roadmaps, track milestone health, and execute with AI assistance.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {goals.length > 0 && (
                    <button
                      onClick={async () => {
                        if (confirm('Are you sure you want to delete ALL goals and tasks? This cannot be undone.')) {
                          await fetch('/api/goals', { method: 'DELETE' });
                          setCachedGoals([]);
                          fetchGoals(true);
                        }
                      }}
                      className="flex items-center gap-1.5 h-10 px-3.5 rounded-lg border border-error/30 text-error hover:bg-error-container/20 text-xs font-semibold transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                      <span>Clear All Goals</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary-container text-on-primary text-xs font-semibold shadow-xs hover:bg-primary transition-all cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Create New Goal</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {(['ALL', 'AT_RISK', 'ON_TRACK', 'AHEAD', 'COMPLETED'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      filter === tab
                        ? 'bg-primary-container text-on-primary shadow-xs'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {tab === 'ALL'
                      ? `All (${goals.length})`
                      : tab === 'AT_RISK'
                      ? 'At Risk'
                      : tab === 'ON_TRACK'
                      ? 'On Track'
                      : tab === 'AHEAD'
                      ? 'Ahead'
                      : 'Completed'}
                  </button>
                ))}
              </div>

              {/* Goals Cards List */}
              {loading ? (
                <div className="p-12 text-center text-sm text-outline">Loading roadmaps...</div>
              ) : filteredGoals.length === 0 ? (
                <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-[#E5E4DC] flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-4xl text-outline">flag</span>
                  <p className="text-sm font-semibold text-on-surface">No goals found</p>
                  <p className="text-xs text-on-surface-variant max-w-sm">
                    {search ? 'Try adjusting your search criteria.' : 'Create your first goal to generate an AI roadmap.'}
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="mt-2 h-9 px-4 rounded-lg bg-primary-container text-on-primary text-xs font-semibold"
                  >
                    New Goal
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGoals.map((g) => {
                    const isAtRisk = g.status === 'AT_RISK';
                    const isAhead = g.status === 'AHEAD';
                    const isCompleted = g.status === 'COMPLETED';

                    return (
                      <div
                        key={g.id}
                        className="bg-surface-container-lowest rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-5 border border-[#E5E4DC] group"
                      >
                        <div className="flex flex-col gap-4">
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

                            <span className="text-xs text-outline font-medium flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">event</span>
                              <span>
                                {new Intl.DateTimeFormat('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                }).format(new Date(g.targetDate))}
                              </span>
                            </span>
                          </div>

                          <div>
                            <Link
                              href={`/goals/${g.id}`}
                              className="text-base font-bold text-on-surface group-hover:text-primary transition-colors block"
                            >
                              {g.title}
                            </Link>
                            <p className="text-xs text-on-surface-variant line-clamp-2 mt-1">{g.description}</p>
                          </div>

                          {/* Progress */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-on-surface-variant">Completion</span>
                              <span className="font-bold text-primary">{Math.round(g.progress)}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary-container"
                                style={{ width: `${Math.round(g.progress)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-surface-container text-xs">
                          <span className="text-outline">
                            {g.milestones ? `${g.milestones.length} milestones` : ''}
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
                              className="text-primary font-semibold hover:underline flex items-center gap-1"
                            >
                              <span>Open Workspace</span>
                              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <NewGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGoalCreated={() => fetchGoals()}
      />
    </div>
  );
}
