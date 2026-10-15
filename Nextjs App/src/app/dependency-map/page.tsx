'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Goal, Task } from '@/lib/types';
import { NewGoalModal } from '@/components/NewGoalModal';
import { loadGoalsCached, getCachedGoals, subscribeToStore } from '@/lib/client-store';

export default function DependencyMapPage() {
  const [goals, setGoals] = useState<Goal[]>(() => getCachedGoals() || []);
  const [selectedGoalId, setSelectedGoalId] = useState<string>(() => {
    const cached = getCachedGoals();
    return cached && cached.length > 0 ? cached[0].id : '';
  });
  const [viewMode, setViewMode] = useState<'GRAPH' | 'GANTT'>('GRAPH');
  const [highlightCriticalPath, setHighlightCriticalPath] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => !getCachedGoals());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchGoals = async (force = false) => {
    try {
      const data = await loadGoalsCached(force);
      setGoals(data);
      if (data.length > 0 && !selectedGoalId) {
        setSelectedGoalId(data[0].id);
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
        if (cached.length > 0 && !selectedGoalId) {
          setSelectedGoalId(cached[0].id);
        }
      }
    });
  }, []);

  const currentGoal = goals.find((g) => g.id === selectedGoalId) || goals[0];

  const tasks: Task[] = currentGoal?.tasks || [];

  const nodes = tasks.map((t, idx) => {
    const milestoneIdx = currentGoal?.milestones?.findIndex((m) => m.id === t.milestoneId);
    const col = milestoneIdx !== undefined && milestoneIdx >= 0 ? milestoneIdx + 1 : (idx % 3) + 1;
    const top = 30 + ((idx * 85) % 320);

    return {
      id: t.id,
      title: t.title,
      col,
      top,
      status: t.status,
      estimate: `${Math.round(t.estimatedMins / 60) || 1}h`,
      assignee: t.assignee?.name
        ? t.assignee.name.split(' ')[0]
        : t.assigneeName
        ? t.assigneeName.split(' ')[0]
        : 'Team',
      isCritical: t.isNextStep || t.priority === 'HIGH' || t.priority === 'URGENT',
      prerequisiteTaskIds: t.prerequisiteTaskIds || t.prerequisites?.map((p) => p.dependsOnTaskId) || [],
    };
  });

  const selectedNodeObj = nodes.find((n) => n.id === selectedNode) || nodes[0];

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased">
      <Sidebar onOpenNewGoal={() => setIsModalOpen(true)} />
      <div className="lg:pl-60">
        <Header />

        <main className="relative pt-16 bg-surface min-h-screen pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col w-full gap-6">
              {/* Header */}
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs font-semibold">
                    <Link href="/my-goals" className="hover:text-primary transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">flag</span>
                      Goals
                    </Link>
                    {currentGoal && (
                      <>
                        <span className="text-outline">/</span>
                        <Link href={`/goals/${currentGoal.id}`} className="hover:text-primary transition-colors">
                          {currentGoal.title}
                        </Link>
                      </>
                    )}
                    <span className="text-outline">/</span>
                    <span className="text-primary font-bold">Dependency Map</span>
                  </nav>
                  <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                    Task Dependency Graph & Critical Path
                  </h1>
                  <p className="text-xs text-on-surface-variant max-w-2xl">
                    Visualizing task relationships, bottlenecks, and the critical execution sequence across your goals.
                  </p>
                </div>

                {/* Action Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                  {goals.length > 1 && (
                    <select
                      value={selectedGoalId}
                      onChange={(e) => setSelectedGoalId(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-[#E5E4DC] bg-white text-xs font-semibold text-on-surface"
                    >
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* View Mode Switch */}
                  <div className="flex items-center p-1 rounded-xl bg-surface-container-high shadow-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('GRAPH')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        viewMode === 'GRAPH'
                          ? 'bg-surface-container-lowest text-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">account_tree</span>
                      <span>Graph View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('GANTT')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        viewMode === 'GANTT'
                          ? 'bg-surface-container-lowest text-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">view_timeline</span>
                      <span>Timeline View</span>
                    </button>
                  </div>

                  {/* Critical Path Toggle */}
                  <button
                    type="button"
                    onClick={() => setHighlightCriticalPath(!highlightCriticalPath)}
                    className={`flex items-center gap-1.5 h-10 px-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      highlightCriticalPath
                        ? 'bg-error-container/40 border-error text-error'
                        : 'bg-surface-container-low border-surface-container text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">timeline</span>
                    <span>Critical Path</span>
                  </button>
                </div>
              </header>

              {loading ? (
                <div className="h-64 flex items-center justify-center text-xs text-on-surface-variant">
                  Loading dependency graph...
                </div>
              ) : goals.length === 0 || nodes.length === 0 ? (
                <div className="bg-surface-container-lowest rounded-2xl p-12 border border-[#E5E4DC] text-center flex flex-col items-center justify-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#E7EFE8] text-[#315B46] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">account_tree</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">No dependency nodes found</h3>
                    <p className="text-xs text-on-surface-variant max-w-md mt-1">
                      Create a goal and add execution tasks in your workspace to visualize dependency paths, bottlenecks, and critical sequences.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#315B46] text-white text-xs font-semibold hover:bg-[#284937] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Create Goal</span>
                  </button>
                </div>
              ) : viewMode === 'GRAPH' ? (
                /* Dynamic Interactive Graph Canvas */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-8 bg-surface-container-lowest rounded-2xl p-6 border border-[#E5E4DC] shadow-xs relative min-h-[460px] overflow-x-auto">
                    {/* Columns representing Phases */}
                    <div className="grid grid-cols-3 gap-6 min-w-[600px] h-full">
                      {(currentGoal?.milestones?.length ? currentGoal.milestones : [{ id: 'm1', title: 'Phase 1: Architecture & Tasks', phaseNumber: 1 }]).map((ms, mIdx) => {
                        const msNodes = nodes.filter((n) => n.col === mIdx + 1);
                        return (
                          <div key={ms.id} className="flex flex-col gap-3 border-r border-dashed border-[#E5E4DC] pr-4 last:border-r-0">
                            <div className="flex items-center justify-between pb-2 border-b border-[#E5E4DC]">
                              <span className="text-xs font-bold text-primary truncate">{ms.title}</span>
                              <span className="text-[10px] bg-surface-container px-2 py-0.5 rounded-full text-primary font-semibold">
                                {msNodes.length} tasks
                              </span>
                            </div>

                            <div className="flex flex-col gap-3">
                              {msNodes.map((node) => {
                                const isSelected = selectedNodeObj?.id === node.id;
                                const isCritical = node.isCritical && highlightCriticalPath;
                                const isCompleted = node.status === 'COMPLETED';
                                const isBlocked = node.status === 'BLOCKED';

                                return (
                                  <div
                                    key={node.id}
                                    onClick={() => setSelectedNode(node.id)}
                                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                                      isSelected
                                        ? 'ring-2 ring-primary border-primary bg-surface-container-high/60 shadow-xs'
                                        : isCritical
                                        ? 'border-error/40 bg-error-container/10 hover:bg-error-container/20'
                                        : 'border-[#E5E4DC] bg-white hover:bg-surface-container-low'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          isCompleted
                                            ? 'bg-primary'
                                            : isBlocked
                                            ? 'bg-error'
                                            : 'bg-amber-500'
                                        }`}
                                      ></span>
                                      <span className="text-[10px] text-outline font-mono">{node.estimate}</span>
                                    </div>
                                    <h4 className="text-xs font-bold text-on-surface line-clamp-2">{node.title}</h4>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E5E4DC] text-[10px] text-on-surface-variant">
                                      <span>{node.assignee}</span>
                                      <span className="font-semibold uppercase">{node.status}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Detail Card */}
                  <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl p-6 border border-[#E5E4DC] shadow-xs flex flex-col gap-4">
                    {selectedNodeObj ? (
                      <>
                        <div className="flex items-center justify-between pb-3 border-b border-[#E5E4DC]">
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">Node Telemetry</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-primary">
                            {selectedNodeObj.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-on-surface">{selectedNodeObj.title}</h3>
                        <div className="space-y-2 text-xs text-on-surface-variant">
                          <div className="flex justify-between py-1 border-b border-[#E5E4DC]">
                            <span>Duration Estimate</span>
                            <span className="font-bold text-on-surface">{selectedNodeObj.estimate}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#E5E4DC]">
                            <span>Assignee</span>
                            <span className="font-bold text-on-surface">{selectedNodeObj.assignee}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-[#E5E4DC]">
                            <span>Critical Path</span>
                            <span className={`font-bold ${selectedNodeObj.isCritical ? 'text-error' : 'text-primary'}`}>
                              {selectedNodeObj.isCritical ? 'Yes (Constraining)' : 'No'}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Link
                            href={currentGoal ? `/goals/${currentGoal.id}` : '/my-goals'}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors"
                          >
                            <span>Inspect in Workspace</span>
                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                          </Link>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-outline text-center py-8">Select a task node to view dependency details.</p>
                    )}
                  </div>
                </div>
              ) : (
                /* Timeline / Gantt View */
                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-[#E5E4DC] shadow-xs overflow-x-auto">
                  <div className="min-w-[600px] flex flex-col gap-4">
                    <div className="grid grid-cols-12 gap-2 pb-2 border-b border-[#E5E4DC] text-[11px] font-bold text-outline uppercase tracking-wider">
                      <span className="col-span-5">Task & Milestone</span>
                      <span className="col-span-2">Owner</span>
                      <span className="col-span-2">Status</span>
                      <span className="col-span-3 text-right">Schedule Bar</span>
                    </div>

                    {nodes.map((node, i) => (
                      <div key={node.id} className="grid grid-cols-12 gap-2 items-center text-xs py-2 border-b border-surface-container last:border-b-0">
                        <span className="col-span-5 font-semibold text-on-surface truncate">{node.title}</span>
                        <span className="col-span-2 text-on-surface-variant truncate">{node.assignee}</span>
                        <span className="col-span-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-primary">
                            {node.status}
                          </span>
                        </span>
                        <div className="col-span-3 flex justify-end">
                          <div className="w-full bg-surface-container rounded-full h-3 relative overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(100, (i + 1) * 25)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
