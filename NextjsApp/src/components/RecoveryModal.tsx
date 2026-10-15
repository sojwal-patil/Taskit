'use client';

import React, { useState } from 'react';
import { RecoveryPlan } from '@/lib/types';

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: RecoveryPlan | null;
  onPlanApplied?: (recoveredDays: number) => void;
}

export function RecoveryModal({
  isOpen,
  onClose,
  plan,
  onPlanApplied,
}: RecoveryModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    plan ? plan.adjustments.filter((a) => a.isSelected).map((a) => a.id) : []
  );
  const [isApplying, setIsApplying] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !plan) return null;

  const toggleAdjustment = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === plan.adjustments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(plan.adjustments.map((a) => a.id));
    }
  };

  // Calculate live dynamic recovered days
  const totalRecovered = plan.adjustments
    .filter((a) => selectedIds.includes(a.id))
    .reduce((sum, a) => sum + a.recoveryDays, 0);

  const netDelay = Math.max(0, plan.projectedSlipDays - totalRecovered);
  const isOnTrack = netDelay === 0;

  const handleApply = async () => {
    setIsApplying(true);
    setFeedbackMsg(null);

    try {
      const res = await fetch(`/api/recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: plan.goalId,
          planId: plan.id,
          selectedAdjustmentIds: selectedIds,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to apply recovery adjustments.');
      }

      const data = await res.json();
      setFeedbackMsg({
        type: 'success',
        text: data.message || `Successfully recovered ${totalRecovered.toFixed(1)} days. Schedule re-aligned!`,
      });

      if (onPlanApplied) {
        onPlanApplied(totalRecovered);
      }

      setTimeout(() => {
        onClose();
        setFeedbackMsg(null);
      }, 1500);
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error applying recovery plan.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-inverse-surface/40 backdrop-blur-xs transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] border border-[#E5E4DC] transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Gradient Tint Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-primary-container to-primary shrink-0"></div>

        {/* Modal Header */}
        <div className="p-6 pb-3 bg-surface-container-lowest shrink-0 border-b border-surface-container-high/60">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 text-[11px] font-semibold tracking-wide uppercase">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                <span>Schedule Deviation Detected</span>
              </div>
              <h2 className="text-xl font-bold text-on-surface tracking-tight">
                Recovery Plan: {plan.goalTitle || 'Active Goal'}
              </h2>
              <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                <span>
                  Goal Target: <strong className="text-on-surface font-semibold">Nov 15, 2024</strong>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Core Engineering Path
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              type="button"
              aria-label="Close dialog"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Algorithmic forecast notice */}
          <div className="rounded-xl bg-surface-container-low/70 border border-surface-container-high p-3.5 flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] text-primary-container mt-0.5 shrink-0">
              smart_toy
            </span>
            <div className="text-xs text-on-surface-variant leading-relaxed">
              Recent blockers on <span className="font-semibold text-on-surface">Apple Privacy Manifest Audit</span>{' '}
              caused an algorithmic schedule drift of{' '}
              <strong className="text-error font-semibold">+{plan.projectedSlipDays.toFixed(1)} days</strong>. Select
              proposed trade-offs below to rebalance milestone critical paths.
            </div>
          </div>

          {/* Timeline Impact & Metric Comparison Card */}
          <div className="rounded-xl bg-surface-container-lowest border border-[#E5E4DC] p-4 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">tune</span>
                Schedule Forecast Comparison
              </span>
              <span className="text-[11px] text-on-surface-variant bg-surface-container-low px-2.5 py-0.5 rounded-full font-medium">
                Monte Carlo Simulation • 94% Confidence
              </span>
            </div>

            {/* 2-Column Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Unmitigated */}
              <div className="bg-surface-container-low/40 rounded-xl p-3 border border-error/20 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-error-container text-error flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">event_busy</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    Current Trajectory (Unmitigated)
                  </span>
                  <span className="text-sm font-bold text-on-surface">Nov 19, 2024</span>
                  <span className="text-[11px] text-error font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">arrow_upward</span> +4 days delay
                  </span>
                </div>
              </div>

              {/* Recovered Forecast */}
              <div
                className={`rounded-xl p-3 border flex items-start gap-3 transition-colors ${
                  isOnTrack
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-amber-500/5 border-amber-500/20'
                }`}
              >
                <div
                  className={`p-2 rounded-lg flex items-center justify-center shrink-0 ${
                    isOnTrack ? 'bg-primary-fixed text-primary' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isOnTrack ? 'verified' : 'schedule'}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] text-on-surface-variant font-medium">Recovered Forecast</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-on-surface">
                      {isOnTrack ? 'Nov 15, 2024' : `Nov ${(15 + netDelay).toFixed(0)}, 2024`}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOnTrack ? 'bg-primary-fixed text-primary' : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      {isOnTrack ? 'On Target' : `+${netDelay.toFixed(1)}d slip`}
                    </span>
                  </div>
                  <span className="text-[11px] text-primary font-medium">
                    {totalRecovered.toFixed(1)} days recovered
                  </span>
                </div>
              </div>
            </div>

            {/* Precision Range Bar */}
            <div className="space-y-1.5 pt-2 border-t border-surface-container">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Plan Forecast: <strong className="text-on-surface">{isOnTrack ? 'Nov 15' : 'Nov 17'}</strong></span>
                <span className="text-primary font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">flag</span> Target: Nov 15
                </span>
                <span className="text-error">Max Slip: Nov 19</span>
              </div>
              <div className="relative w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-error/20 rounded-full"></div>
                <div
                  className="absolute left-0 top-0 bottom-0 bg-primary-container rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(10, (totalRecovered / plan.projectedSlipDays) * 100))}%` }}
                ></div>
                <div
                  className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-on-surface z-10"
                  title="Target Deadline"
                ></div>
              </div>
            </div>
          </div>

          {/* Recommended Adjustments */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                  Recommended Adjustments
                </span>
                <span className="text-[11px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full font-semibold">
                  {selectedIds.length} of {plan.adjustments.length} selected
                </span>
              </div>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-primary font-semibold hover:underline cursor-pointer"
              >
                {selectedIds.length === plan.adjustments.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Adjustments Cards */}
            <div className="space-y-2">
              {plan.adjustments.map((adj) => {
                const checked = selectedIds.includes(adj.id);
                return (
                  <label
                    key={adj.id}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                      checked
                        ? 'bg-surface-container-lowest border-primary/40 shadow-xs'
                        : 'bg-surface-container-low/50 border-[#E5E4DC] opacity-80'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAdjustment(adj.id)}
                      className="mt-1 w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-on-surface">{adj.title}</p>
                          <span className="text-[11px] text-outline">
                            {adj.milestoneTitle || adj.taskTitle || 'Milestone Track'}
                          </span>
                        </div>
                        <span className="shrink-0 text-[11px] text-primary font-semibold bg-primary-fixed/50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">speed</span>
                          Recovers {adj.recoveryDays.toFixed(1)} days
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-surface-container/60">
                        {adj.resourceRequirement && (
                          <div className="flex items-center gap-1 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px] text-primary shrink-0">badge</span>
                            <span>{adj.resourceRequirement}</span>
                          </div>
                        )}
                        {adj.tradeoff && (
                          <div className="flex items-center gap-1 text-amber-800">
                            <span className="material-symbols-outlined text-[14px] text-amber-700 shrink-0">
                              warning
                            </span>
                            <span>{adj.tradeoff}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Feedback message banner */}
          {feedbackMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-primary-fixed/60 text-primary font-semibold'
                  : 'bg-error-container text-error'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {feedbackMsg.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{feedbackMsg.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-container-low shrink-0 border-t border-surface-container-high/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
            <span className="material-symbols-outlined text-[16px] text-outline">verified_user</span>
            <span>Snapshot created • Reversible in Activity History</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors cursor-pointer"
              type="button"
            >
              Keep Current Plan
            </button>
            <button
              onClick={handleApply}
              disabled={isApplying || selectedIds.length === 0}
              className="h-9 px-4 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
              type="button"
            >
              {isApplying ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                  <span>Apply Recovery Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
