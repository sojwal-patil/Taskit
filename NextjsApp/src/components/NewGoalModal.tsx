'use client';

import React, { useState } from 'react';
import { GeneratedPlanProposal, Goal } from '@/lib/types';
import { addCachedGoal } from '@/lib/client-store';

interface NewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated?: (newGoal: Goal) => void;
}

export function NewGoalModal({ isOpen, onClose, onGoalCreated }: NewGoalModalProps) {
  const [goalInput, setGoalInput] = useState('');
  const [targetDateInput, setTargetDateInput] = useState(() => {
    const d = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [proposedPlan, setProposedPlan] = useState<GeneratedPlanProposal | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculateWeeks = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(1, Math.round(diff / (7 * 24 * 60 * 60 * 1000)));
  };

  const currentDurationWeeks = calculateWeeks(targetDateInput);

  const suggestions = [
    'Launch iOS beta in 6 weeks',
    'Prepare Series A pitch deck',
    'Run a half-marathon by spring',
    'Redesign onboarding funnel',
  ];

  const handleGenerate = async (customPrompt?: string) => {
    const promptToUse = customPrompt || goalInput;
    if (!promptToUse.trim()) return;

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalTitle: promptToUse,
          timeframeWeeks: currentDurationWeeks,
          targetDate: new Date(targetDateInput).toISOString(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to generate roadmap');
      }

      const plan: GeneratedPlanProposal = await res.json();
      plan.targetDate = new Date(targetDateInput).toISOString();
      plan.suggestedDurationWeeks = currentDurationWeeks;
      setProposedPlan(plan);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong generating the plan.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlan = async () => {
    if (!proposedPlan) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...proposedPlan,
        targetDate: proposedPlan.targetDate || new Date(targetDateInput).toISOString(),
      };
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to save goal roadmap');
      }

      const savedGoal = await res.json();
      addCachedGoal(savedGoal);
      if (onGoalCreated) {
        onGoalCreated(savedGoal);
      }
      onClose();
      // Reset state
      setProposedPlan(null);
      setGoalInput('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save roadmap.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-[#E5E4DC]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Line */}
        <div className="h-1.5 w-full bg-primary-container shrink-0"></div>

        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-surface-container">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            <span>Adaptive Goal Composer</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Main Input Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
              What would you like to accomplish?
            </label>
            <div className="relative flex items-center bg-surface-container-low rounded-xl p-1.5 transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/20">
              <span className="material-symbols-outlined text-outline ml-3 text-[20px]">explore</span>
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerate();
                }}
                placeholder="e.g. Launch iOS beta in 6 weeks, or Redesign design tokens..."
                className="w-full bg-transparent border-0 px-3 py-2 text-base text-on-surface placeholder:text-outline focus:outline-none"
              />
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !goalInput.trim()}
                className="shrink-0 flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary-container text-on-primary text-sm font-semibold hover:bg-primary transition-all disabled:opacity-50 cursor-pointer"
                type="button"
              >
                {isGenerating ? (
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

            {/* Target Date Input Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-container-low border border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">event</span>
                <div className="flex flex-col">
                  <label htmlFor="goalTargetDate" className="text-xs font-bold text-on-surface">Target Completion Date</label>
                  <span className="text-[11px] text-on-surface-variant">
                    {currentDurationWeeks} weeks execution window
                  </span>
                </div>
              </div>
              <input
                id="goalTargetDate"
                type="date"
                value={targetDateInput}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setTargetDateInput(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-surface-container text-xs text-on-surface font-semibold border border-[#E5E4DC] focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              />
            </div>
          </div>

          {/* Prompt Suggestions */}
          {!proposedPlan && (
            <div className="space-y-2 pt-1">
              <span className="text-xs text-on-surface-variant font-medium">Try exploring:</span>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setGoalInput(s);
                      handleGenerate(s);
                    }}
                    className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-variant hover:text-primary transition-colors cursor-pointer"
                  >
                    <span>{s}</span>
                    <span className="material-symbols-outlined text-[13px] text-outline">arrow_forward</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-error-container/40 text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Generated Plan Review */}
          {proposedPlan && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                  <div>
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                      Proposed Roadmap ({currentDurationWeeks} weeks)
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      Target deadline: {new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(targetDateInput))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={targetDateInput}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setTargetDateInput(e.target.value);
                      if (proposedPlan) {
                        const newWeeks = calculateWeeks(e.target.value);
                        setProposedPlan({
                          ...proposedPlan,
                          targetDate: new Date(e.target.value).toISOString(),
                          suggestedDurationWeeks: newWeeks,
                        });
                      }
                    }}
                    className="h-8 px-2 rounded-lg bg-surface-container-lowest text-xs text-on-surface font-semibold border border-[#E5E4DC] focus:outline-none cursor-pointer"
                    title="Adjust target date of plan"
                  />
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary-fixed text-primary flex items-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                    Adaptive
                  </span>
                </div>
              </div>

              {/* Milestones & Tasks Preview List */}
              <div className="space-y-3">
                {proposedPlan.milestones.map((m, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-[#E5E4DC] bg-surface-container-lowest space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {m.phaseNumber}
                        </span>
                        <h4 className="text-sm font-bold text-on-surface">{m.title}</h4>
                      </div>
                      <span className="text-xs text-outline">{m.tasks.length} tasks</span>
                    </div>
                    {m.description && <p className="text-xs text-on-surface-variant">{m.description}</p>}

                    <div className="space-y-1.5 pt-1">
                      {m.tasks.map((t, tIdx) => (
                        <div
                          key={tIdx}
                          className="flex items-center justify-between p-2 rounded-lg bg-surface-container-low/60 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                            <span className="font-medium text-on-surface truncate">{t.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-outline">{t.estimatedHours}h</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                t.priority === 'HIGH' || t.priority === 'URGENT'
                                  ? 'bg-error-container text-error'
                                  : 'bg-surface-container text-on-surface-variant'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-surface-container-low shrink-0 border-t border-surface-container flex items-center justify-between">
          <button
            onClick={() => {
              setProposedPlan(null);
              setGoalInput('');
            }}
            className="text-xs text-on-surface-variant hover:text-on-surface font-semibold cursor-pointer"
            type="button"
          >
            Clear
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors cursor-pointer"
              type="button"
            >
              Cancel
            </button>
            {proposedPlan && (
              <button
                onClick={handleSavePlan}
                disabled={isSaving}
                className="h-9 px-4 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                type="button"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    <span>Save Plan to Workspace</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
