import { describe, it, expect } from 'vitest';
import { generateDeterministicPlan } from '../lib/ai/fallback';
import { validateNoCircularDependencies, DependencyEdge } from '../lib/engine/dependency';

describe('AI Planner & Fallback Engine', () => {
  it('should generate valid structured plan for mobile app MVP', () => {
    const plan = generateDeterministicPlan('Launch Mobile App MVP');

    expect(plan.title).toBe('Launch Mobile App MVP');
    expect(plan.category).toBe('Product Launch');
    expect(plan.suggestedDurationWeeks).toBeGreaterThanOrEqual(4);
    expect(plan.milestones.length).toBeGreaterThanOrEqual(3);

    // Verify task structure and estimates
    let totalTasks = 0;
    const taskTitles: string[] = [];
    const edges: DependencyEdge[] = [];

    for (const m of plan.milestones) {
      expect(m.tasks.length).toBeGreaterThan(0);
      for (const t of m.tasks) {
        totalTasks++;
        taskTitles.push(t.title);
        expect(t.estimatedHours).toBeGreaterThan(0);
        if (t.prerequisiteTaskTitles) {
          for (const prereq of t.prerequisiteTaskTitles) {
            edges.push({ taskId: t.title, dependsOnTaskId: prereq });
          }
        }
      }
    }

    expect(totalTasks).toBeGreaterThanOrEqual(6);

    // Verify generated plan has NO circular dependencies
    const cycleCheck = validateNoCircularDependencies(taskTitles, edges);
    expect(cycleCheck.valid).toBe(true);
  });

  it('should generate valid structured plan for fundraising deck', () => {
    const plan = generateDeterministicPlan('Prepare Series A pitch deck');

    expect(plan.category).toBe('Fundraising');
    expect(plan.milestones.length).toBeGreaterThanOrEqual(2);

    const taskTitles: string[] = [];
    const edges: DependencyEdge[] = [];

    for (const m of plan.milestones) {
      for (const t of m.tasks) {
        taskTitles.push(t.title);
        if (t.prerequisiteTaskTitles) {
          for (const p of t.prerequisiteTaskTitles) {
            edges.push({ taskId: t.title, dependsOnTaskId: p });
          }
        }
      }
    }

    const cycleCheck = validateNoCircularDependencies(taskTitles, edges);
    expect(cycleCheck.valid).toBe(true);
  });
});
