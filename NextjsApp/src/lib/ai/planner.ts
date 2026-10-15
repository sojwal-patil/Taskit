// Unified Planner Service
// Seamlessly delegates to Groq AI when configured, verifies dependency graph integrity,
// and falls back gracefully to the deterministic engine when needed.

import { generatePlanWithGroq } from './groq';
import { generateDeterministicPlan } from './fallback';
import { GeneratedPlanProposal } from '../types';
import { validateNoCircularDependencies, DependencyEdge } from '../engine/dependency';

export async function createProposedRoadmap(
  goalTitle: string,
  timeframeWeeks?: number,
  targetDate?: string
): Promise<GeneratedPlanProposal> {
  const cleanTitle = goalTitle.trim();
  if (!cleanTitle) {
    throw new Error('Goal title cannot be empty.');
  }

  // 1. Try Groq AI first if credentials exist
  try {
    const groqPlan = await generatePlanWithGroq(cleanTitle, timeframeWeeks);
    if (groqPlan) {
      if (targetDate) groqPlan.targetDate = targetDate;
      // Validate that Groq did not create circular dependencies among tasks
      const allTaskTitles: string[] = [];
      const edges: DependencyEdge[] = [];

      for (const m of groqPlan.milestones) {
        for (const t of m.tasks) {
          allTaskTitles.push(t.title);
          if (t.prerequisiteTaskTitles && Array.isArray(t.prerequisiteTaskTitles)) {
            for (const prereqTitle of t.prerequisiteTaskTitles) {
              edges.push({
                taskId: t.title,
                dependsOnTaskId: prereqTitle,
              });
            }
          }
        }
      }

      const cycleCheck = validateNoCircularDependencies(allTaskTitles, edges);
      if (cycleCheck.valid) {
        return groqPlan;
      }
      console.warn('Groq proposal contained circular dependencies. Using safe deterministic plan instead.');
    }
  } catch (err) {
    console.warn('Error invoking Groq AI, using deterministic fallback planner:', err);
  }

  // 2. Deterministic fallback planner (always guaranteed to succeed with valid acyclic roadmap)
  return generateDeterministicPlan(cleanTitle, timeframeWeeks, targetDate);
}
