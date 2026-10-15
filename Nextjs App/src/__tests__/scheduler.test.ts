import { describe, it, expect } from 'vitest';
import { calculateGoalMetrics, calculateMilestoneProgress } from '../lib/engine/scheduler';
import { Task } from '../lib/types';

describe('Scheduler Engine', () => {
  it('should calculate 0% progress when no tasks are completed', () => {
    const goal = {
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      effortAllocatedHours: 40,
      effortSpentHours: 0,
    };
    const tasks: Task[] = [
      {
        id: 't1',
        goalId: 'g1',
        title: 'Task 1',
        status: 'READY',
        priority: 'MEDIUM',
        estimatedMins: 120,
        loggedMins: 0,
        isNextStep: true,
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const metrics = calculateGoalMetrics(goal, tasks);
    expect(metrics.progressPercent).toBe(0);
    expect(metrics.status).toBe('ON_TRACK');
  });

  it('should calculate 100% progress and mark COMPLETED when all tasks are complete', () => {
    const goal = {
      targetDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      effortAllocatedHours: 40,
      effortSpentHours: 40,
    };
    const tasks: Task[] = [
      {
        id: 't1',
        goalId: 'g1',
        title: 'Task 1',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        estimatedMins: 120,
        loggedMins: 120,
        isNextStep: false,
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const metrics = calculateGoalMetrics(goal, tasks);
    expect(metrics.progressPercent).toBe(100);
    expect(metrics.status).toBe('COMPLETED');
  });

  it('should detect AT_RISK status when blocked tasks exist and slip is projected', () => {
    // Goal deadline is tomorrow (1 day away), but 20 hours remaining with a blocked task
    const goal = {
      targetDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      effortAllocatedHours: 40,
      effortSpentHours: 10,
    };
    const tasks: Task[] = [
      {
        id: 't1',
        goalId: 'g1',
        title: 'Task 1',
        status: 'BLOCKED',
        priority: 'URGENT',
        estimatedMins: 1200, // 20 hours
        loggedMins: 0,
        isNextStep: false,
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const metrics = calculateGoalMetrics(goal, tasks);
    expect(metrics.projectedSlipDays).toBeGreaterThan(0);
    expect(metrics.status).toBe('AT_RISK');
    expect(metrics.blockedTasks).toBe(1);
  });

  it('should accurately calculate milestone progress percentage', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        goalId: 'g1',
        title: 'Task 1',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        estimatedMins: 60,
        loggedMins: 60,
        isNextStep: false,
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 't2',
        goalId: 'g1',
        title: 'Task 2',
        status: 'READY',
        priority: 'MEDIUM',
        estimatedMins: 60,
        loggedMins: 0,
        isNextStep: false,
        order: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const progress = calculateMilestoneProgress(tasks);
    expect(progress).toBe(50);
  });
});
