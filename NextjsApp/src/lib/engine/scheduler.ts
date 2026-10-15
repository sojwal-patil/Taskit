// Taskit Scheduling, Velocity & Risk Calculation Engine
import { GoalStatus, Task, Milestone } from '../types';

export interface ScheduleMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  readyTasks: number;
  progressPercent: number;
  daysRemaining: number;
  allocatedHours: number;
  spentHours: number;
  remainingHours: number;
  projectedSlipDays: number;
  status: GoalStatus;
  statusReason: string;
}

/**
 * Calculates deterministic progress and health status for a goal
 */
export function calculateGoalMetrics(
  goal: {
    targetDate: string;
    effortAllocatedHours: number;
    effortSpentHours: number;
  },
  tasks: Task[],
  _milestones: Milestone[] = []
): ScheduleMetrics {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED').length;
  const readyTasks = tasks.filter((t) => t.status === 'READY').length;

  // Percentage completion
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Time remaining
  const now = new Date();
  const target = new Date(goal.targetDate);
  const diffMs = target.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Remaining work hours
  const remainingHours = tasks
    .filter((t) => t.status !== 'COMPLETED')
    .reduce((acc, t) => acc + (t.estimatedMins || 30) / 60, 0);

  // Velocity projection: assume standard working pace of 4 focus hours/day
  const dailyPaceHours = 4;
  const projectedDaysNeeded = Math.ceil(remainingHours / dailyPaceHours);
  const projectedSlipDays = Math.max(0, projectedDaysNeeded - daysRemaining);

  // Deterministic Goal Status calculation
  let status: GoalStatus = 'ON_TRACK';
  let statusReason = 'Work is proceeding within planned milestone buffers.';

  if (progressPercent === 100) {
    status = 'COMPLETED';
    statusReason = 'All milestones and deliverables are completed.';
  } else if (blockedTasks > 0 && projectedSlipDays > 2) {
    status = 'AT_RISK';
    statusReason = `${blockedTasks} critical blocker(s) causing estimated ${projectedSlipDays}-day schedule slip.`;
  } else if (projectedSlipDays > 4) {
    status = 'DELAYED';
    statusReason = `Current pace lags planned target by ${projectedSlipDays} days.`;
  } else if (daysRemaining > 0 && progressPercent >= 80 && projectedSlipDays === 0) {
    status = 'AHEAD';
    statusReason = 'Ahead of planned cadence with minimal remaining work.';
  } else if (projectedSlipDays > 0) {
    status = 'AT_RISK';
    statusReason = `Projected deadline slip of ${projectedSlipDays} days requires schedule rebalancing.`;
  }

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    blockedTasks,
    readyTasks,
    progressPercent,
    daysRemaining,
    allocatedHours: goal.effortAllocatedHours,
    spentHours: goal.effortSpentHours,
    remainingHours: Math.round(remainingHours * 10) / 10,
    projectedSlipDays,
    status,
    statusReason,
  };
}

/**
 * Calculates milestone progress from its associated tasks
 */
export function calculateMilestoneProgress(tasks: Array<{ status: any }>): number {
  if (!tasks || tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
  return Math.round((completed / tasks.length) * 100);
}
