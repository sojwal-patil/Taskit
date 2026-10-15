// TASKIT Persistent Storage & Service Layer (Neon PostgreSQL + Prisma)
// Real database CRUD operations, user-scoped multi-tenancy, and transactions.
// Pure database persistence with strict user ownership enforcement.

import prisma from './prisma';
import {
  Goal,
  Task,
  Milestone,
  UserSettings,
  FocusSession,
  RecoveryPlan,
  ChecklistItem,
} from './types';
import { calculateGoalMetrics, calculateMilestoneProgress } from './engine/scheduler';

/**
 * Ensures a user workspace exists in Neon DB
 */
export async function ensureUserWorkspace(userId?: string): Promise<string> {
  if (!userId) return '';
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? user.id : userId;
  } catch (err) {
    console.error('Error ensuring workspace in Neon DB:', err);
    return userId;
  }
}

// In-memory micro-cache for user goals (eliminates redundant multi-second roundtrips during navigation)
interface CachedGoals {
  goals: Goal[];
  cachedAt: number;
}
const goalsCache = new Map<string, CachedGoals>();
const GOALS_CACHE_TTL_MS = 6000; // 6 seconds

export function invalidateGoalsCache(userId?: string) {
  if (userId) {
    goalsCache.delete(userId);
  } else {
    goalsCache.clear();
  }
}

/**
 * Fetch all goals for an authenticated user with calculated progress
 */
export async function getGoals(userId?: string): Promise<Goal[]> {
  if (!userId) return [];

  // 1. Check memory cache for instant sub-millisecond response
  const cached = goalsCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < GOALS_CACHE_TTL_MS) {
    return cached.goals;
  }

  try {
    const dbGoals = await prisma.goal.findMany({
      where: { userId },
      include: {
        milestones: { orderBy: { phaseNumber: 'asc' } },
        tasks: {
          include: {
            checklistItems: { orderBy: { order: 'asc' } },
            prerequisites: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result: Goal[] = dbGoals.map((g) => {
      const formattedTasks: Task[] = g.tasks.map((t) => ({
        id: t.id,
        goalId: t.goalId,
        milestoneId: t.milestoneId || undefined,
        title: t.title,
        description: t.description || undefined,
        status: t.status as any,
        priority: t.priority as any,
        estimatedMins: t.estimatedMins,
        loggedMins: t.loggedMins,
        dueDate: t.dueDate ? t.dueDate.toISOString() : undefined,
        isNextStep: t.isNextStep,
        order: t.order,
        assigneeName: t.assigneeName || undefined,
        assigneeRole: t.assigneeRole || undefined,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        checklist: t.checklistItems.map((c) => ({
          id: c.id,
          taskId: c.taskId,
          title: c.title,
          isCompleted: c.isCompleted,
          order: c.order,
        })),
        prerequisiteTaskIds: t.prerequisites.map((p) => p.dependsOnTaskId),
      }));

      const formattedMilestones: Milestone[] = g.milestones.map((m) => ({
        id: m.id,
        goalId: m.goalId,
        title: m.title,
        description: m.description || undefined,
        phaseNumber: m.phaseNumber,
        progress: m.progress,
        status: m.status as any,
        targetDate: m.targetDate ? m.targetDate.toISOString() : undefined,
      }));

      const metrics = calculateGoalMetrics(
        {
          targetDate: g.targetDate.toISOString(),
          effortAllocatedHours: g.effortAllocatedHours,
          effortSpentHours: g.effortSpentHours,
        },
        formattedTasks,
        formattedMilestones
      );

      return {
        id: g.id,
        userId: g.userId,
        title: g.title,
        description: g.description,
        category: g.category,
        status: metrics.status,
        progress: metrics.progressPercent,
        targetDate: g.targetDate.toISOString(),
        effortAllocatedHours: g.effortAllocatedHours,
        effortSpentHours: g.effortSpentHours,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
        milestones: formattedMilestones,
        tasks: formattedTasks,
      };
    });

    if (userId) {
      goalsCache.set(userId, { goals: result, cachedAt: Date.now() });
    }
    return result;
  } catch (err) {
    console.error('Neon DB getGoals failed:', err);
    return [];
  }
}

/**
 * Fetch a single goal by ID, enforcing user ownership if userId is supplied
 */
export async function getGoalById(id: string, userId?: string): Promise<Goal | null> {
  try {
    const g = await prisma.goal.findFirst({
      where: {
        id,
        ...(userId ? { userId } : {}),
      },
      include: {
        milestones: { orderBy: { phaseNumber: 'asc' } },
        tasks: {
          include: {
            checklistItems: { orderBy: { order: 'asc' } },
            prerequisites: true,
            downstream: true,
          },
          orderBy: { order: 'asc' },
        },
        recoveryPlans: {
          include: { adjustments: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!g) return null;

    const formattedTasks: Task[] = g.tasks.map((t) => ({
      id: t.id,
      goalId: t.goalId,
      milestoneId: t.milestoneId || undefined,
      title: t.title,
      description: t.description || undefined,
      status: t.status as any,
      priority: t.priority as any,
      estimatedMins: t.estimatedMins,
      loggedMins: t.loggedMins,
      dueDate: t.dueDate ? t.dueDate.toISOString() : undefined,
      isNextStep: t.isNextStep,
      order: t.order,
      assigneeName: t.assigneeName || undefined,
      assigneeRole: t.assigneeRole || undefined,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      checklist: t.checklistItems.map((c) => ({
        id: c.id,
        taskId: c.taskId,
        title: c.title,
        isCompleted: c.isCompleted,
        order: c.order,
      })),
      prerequisiteTaskIds: t.prerequisites.map((p) => p.dependsOnTaskId),
    }));

    const formattedMilestones: Milestone[] = g.milestones.map((m) => ({
      id: m.id,
      goalId: m.goalId,
      title: m.title,
      description: m.description || undefined,
      phaseNumber: m.phaseNumber,
      progress: m.progress,
      status: m.status as any,
      targetDate: m.targetDate ? m.targetDate.toISOString() : undefined,
    }));

    const metrics = calculateGoalMetrics(
      {
        targetDate: g.targetDate.toISOString(),
        effortAllocatedHours: g.effortAllocatedHours,
        effortSpentHours: g.effortSpentHours,
      },
      formattedTasks,
      formattedMilestones
    );

    const recoveryPlans: RecoveryPlan[] = g.recoveryPlans.map((rp) => ({
      id: rp.id,
      goalId: rp.goalId,
      originalTargetDate: rp.originalTargetDate.toISOString(),
      projectedSlipDays: rp.projectedSlipDays,
      recoveredDays: rp.recoveredDays,
      status: rp.status as any,
      simulationNotes: rp.simulationNotes || undefined,
      createdAt: rp.createdAt.toISOString(),
      appliedAt: rp.appliedAt ? rp.appliedAt.toISOString() : undefined,
      adjustments: rp.adjustments.map((a) => ({
        id: a.id,
        recoveryPlanId: a.recoveryPlanId,
        title: a.title,
        milestoneTitle: a.milestoneTitle || undefined,
        taskTitle: a.taskTitle || undefined,
        recoveryDays: a.recoveryDays,
        resourceRequirement: a.resourceRequirement || undefined,
        tradeoff: a.tradeoff || undefined,
        isSelected: a.isSelected,
      })),
    }));

    return {
      id: g.id,
      userId: g.userId,
      title: g.title,
      description: g.description,
      category: g.category,
      status: metrics.status,
      progress: metrics.progressPercent,
      targetDate: g.targetDate.toISOString(),
      effortAllocatedHours: g.effortAllocatedHours,
      effortSpentHours: g.effortSpentHours,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
      milestones: formattedMilestones,
      tasks: formattedTasks,
      recoveryPlans,
    };
  } catch (err) {
    console.error('Error fetching goal from Neon:', err);
    return null;
  }
}

/**
 * Persist a newly generated roadmap proposal to Neon PostgreSQL via transaction
 */
export async function createGoalFromProposal(
  proposal: {
    title: string;
    category?: string;
    description?: string;
    targetDate?: string;
    milestones: Array<{
      title: string;
      description?: string;
      phaseNumber: number;
      tasks: Array<{
        title: string;
        description?: string;
        priority?: string;
        estimatedHours?: number;
        prerequisiteTaskTitles?: string[];
      }>;
    }>;
  },
  userId?: string
): Promise<Goal> {
  const targetUserId = await ensureUserWorkspace(userId);
  if (!targetUserId) {
    throw new Error('Authentication required to create a goal');
  }

  // Pre-fetch user details outside transaction to eliminate a network roundtrip
  let defaultAssignee = 'Workspace Member';
  let defaultRole = 'Contributor';
  try {
    const creatorUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (creatorUser?.name) defaultAssignee = creatorUser.name;
    if (creatorUser?.role) defaultRole = creatorUser.role;
  } catch (err) {
    console.warn('Could not fetch creator user details, using defaults:', err);
  }

  const goalId = 'goal_' + Date.now();
  const targetDate = proposal.targetDate
    ? new Date(proposal.targetDate)
    : new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000);

  let totalAllocatedHours = 0;
  proposal.milestones.forEach((m) => {
    m.tasks.forEach((t) => {
      totalAllocatedHours += t.estimatedHours || 3;
    });
  });

  // Pre-generate unique IDs and dependency mappings in memory
  const timestamp = Date.now();
  const titleToTaskId = new Map<string, string>();

  const preparedMilestones: Array<{
    id: string;
    goalId: string;
    title: string;
    description: string;
    phaseNumber: number;
    progress: number;
    status: 'IN_PROGRESS' | 'NOT_STARTED';
    targetDate?: Date | null;
  }> = [];

  const preparedTasks: Array<{
    id: string;
    goalId: string;
    milestoneId: string;
    title: string;
    description: string;
    status: 'READY';
    priority: any;
    estimatedMins: number;
    isNextStep: boolean;
    order: number;
    assigneeName: string;
    assigneeRole: string;
  }> = [];

  const preparedChecklistItems: Array<{
    taskId: string;
    title: string;
    isCompleted: boolean;
    order: number;
  }> = [];

  const totalDurationMs = Math.max(86400000, targetDate.getTime() - timestamp);
  const totalMilestones = proposal.milestones.length || 1;

  for (let mIdx = 0; mIdx < proposal.milestones.length; mIdx++) {
    const m = proposal.milestones[mIdx];
    const milestoneId = `ms_${timestamp}_${mIdx}`;
    const msTargetDate = new Date(timestamp + Math.round((totalDurationMs * (mIdx + 1)) / totalMilestones));

    preparedMilestones.push({
      id: milestoneId,
      goalId,
      title: m.title,
      description: m.description || '',
      phaseNumber: m.phaseNumber || mIdx + 1,
      progress: 0,
      status: mIdx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      targetDate: msTargetDate,
    });

    for (let tIdx = 0; tIdx < m.tasks.length; tIdx++) {
      const t = m.tasks[tIdx];
      const taskId = `task_${timestamp}_${mIdx}_${tIdx}`;
      titleToTaskId.set(t.title, taskId);

      const isFirst = mIdx === 0 && tIdx === 0;
      const estMins = Math.round((t.estimatedHours || 3) * 60);

      preparedTasks.push({
        id: taskId,
        goalId,
        milestoneId,
        title: t.title,
        description: t.description || '',
        status: 'READY',
        priority: (t.priority as any) || 'MEDIUM',
        estimatedMins: estMins,
        isNextStep: isFirst,
        order: tIdx + 1,
        assigneeName: defaultAssignee,
        assigneeRole: defaultRole,
      });

      preparedChecklistItems.push(
        {
          taskId,
          title: `Kickoff and align on ${t.title}`,
          isCompleted: false,
          order: 1,
        },
        {
          taskId,
          title: `Execution sprint: ${t.title}`,
          isCompleted: false,
          order: 2,
        },
        {
          taskId,
          title: `Review and verify acceptance criteria`,
          isCompleted: false,
          order: 3,
        }
      );
    }
  }

  // Pre-calculate dependencies in memory
  const preparedDependencies: Array<{
    taskId: string;
    dependsOnTaskId: string;
    isCriticalPath: boolean;
  }> = [];

  for (const m of proposal.milestones) {
    for (const t of m.tasks) {
      if (t.prerequisiteTaskTitles && t.prerequisiteTaskTitles.length > 0) {
        const taskId = titleToTaskId.get(t.title);
        if (!taskId) continue;

        for (const prereqTitle of t.prerequisiteTaskTitles) {
          const dependsOnId = titleToTaskId.get(prereqTitle);
          if (dependsOnId && dependsOnId !== taskId) {
            preparedDependencies.push({
              taskId,
              dependsOnTaskId: dependsOnId,
              isCriticalPath: true,
            });
          }
        }
      }
    }
  }

  const createdGoal = await prisma.$transaction(
    async (tx) => {
      // 1. Create Goal
      const goal = await tx.goal.create({
        data: {
          id: goalId,
          userId: targetUserId,
          title: proposal.title,
          description: proposal.description || `Roadmap for ${proposal.title}`,
          category: proposal.category || 'Strategic Initiative',
          status: 'ON_TRACK',
          progress: 0,
          targetDate,
          effortAllocatedHours: totalAllocatedHours || 40,
          effortSpentHours: 0,
        },
      });

      // 2. Batch insert Milestones
      if (preparedMilestones.length > 0) {
        await tx.milestone.createMany({
          data: preparedMilestones,
        });
      }

      // 3. Batch insert Tasks
      if (preparedTasks.length > 0) {
        await tx.task.createMany({
          data: preparedTasks,
        });
      }

      // 4. Batch insert Checklist Items
      if (preparedChecklistItems.length > 0) {
        await tx.checklistItem.createMany({
          data: preparedChecklistItems,
        });
      }

      // 5. Batch insert Task Dependencies
      if (preparedDependencies.length > 0) {
        await tx.taskDependency.createMany({
          data: preparedDependencies,
        });
      }

      // 6. Record Activity History
      await tx.activityHistory.create({
        data: {
          userId: targetUserId,
          goalId: goal.id,
          actionType: 'CREATE_GOAL',
          title: 'Goal roadmap created',
          description: `Created "${goal.title}" with ${proposal.milestones.length} milestones.`,
        },
      });

      return goal;
    },
    {
      maxWait: 15000,
      timeout: 45000,
    }
  );

  invalidateGoalsCache(targetUserId);
  const fullGoal = await getGoalById(createdGoal.id, targetUserId);
  if (!fullGoal) {
    throw new Error('Failed to retrieve established goal');
  }
  return fullGoal;
}

/**
 * Update task status, priority, or time in Neon DB
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Task>,
  userId?: string
): Promise<Task | null> {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { goal: true, milestone: true },
    });

    if (!existing) return null;
    if (userId && existing.goal.userId !== userId) return null;

    const data: any = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.priority !== undefined) data.priority = updates.priority;
    if (updates.loggedMins !== undefined) data.loggedMins = updates.loggedMins;
    if (updates.title !== undefined) data.title = updates.title.trim();
    if (updates.description !== undefined) data.description = updates.description ? updates.description.trim() : '';

    const updated = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        checklistItems: { orderBy: { order: 'asc' } },
        prerequisites: true,
      },
    });

    if (existing.milestoneId) {
      const msTasks = await prisma.task.findMany({
        where: { milestoneId: existing.milestoneId },
      });
      const progress = calculateMilestoneProgress(msTasks);

      await prisma.milestone.update({
        where: { id: existing.milestoneId },
        data: {
          progress,
          status: progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        },
      });
    }

    if (updates.status === 'COMPLETED') {
      await prisma.activityHistory.create({
        data: {
          userId: existing.goal.userId,
          goalId: existing.goalId,
          taskId: existing.id,
          actionType: 'COMPLETE_STEP',
          title: 'Task marked as completed',
          description: `Completed "${existing.title}".`,
        },
      });
    }

    invalidateGoalsCache(existing.goal.userId);
    return {
      id: updated.id,
      goalId: updated.goalId,
      milestoneId: updated.milestoneId || undefined,
      title: updated.title,
      description: updated.description || undefined,
      status: updated.status as any,
      priority: updated.priority as any,
      estimatedMins: updated.estimatedMins,
      loggedMins: updated.loggedMins,
      dueDate: updated.dueDate ? updated.dueDate.toISOString() : undefined,
      isNextStep: updated.isNextStep,
      order: updated.order,
      assigneeName: updated.assigneeName || undefined,
      assigneeRole: updated.assigneeRole || undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      checklist: updated.checklistItems.map((c) => ({
        id: c.id,
        taskId: c.taskId,
        title: c.title,
        isCompleted: c.isCompleted,
        order: c.order,
      })),
      prerequisiteTaskIds: updated.prerequisites.map((p) => p.dependsOnTaskId),
    };
  } catch (err) {
    console.error('Neon DB updateTask failed:', err);
    return null;
  }
}

/**
 * Toggle checklist item completion status in Neon DB
 */
export async function toggleChecklistItem(
  taskId: string,
  itemId: string,
  isCompleted: boolean,
  userId?: string
): Promise<ChecklistItem | null> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { goal: true },
    });
    if (!task) return null;
    if (userId && task.goal.userId !== userId) return null;

    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { isCompleted },
    });

    if (task.milestoneId) {
      const msTasks = await prisma.task.findMany({
        where: { milestoneId: task.milestoneId },
      });
      const progress = calculateMilestoneProgress(msTasks);
      await prisma.milestone.update({
        where: { id: task.milestoneId },
        data: { progress },
      });
    }

    return {
      id: item.id,
      taskId: item.taskId,
      title: item.title,
      isCompleted: item.isCompleted,
      order: item.order,
    };
  } catch (err) {
    console.error('Neon DB toggleChecklistItem failed:', err);
    return null;
  }
}

/**
 * Persist completed focus session to Neon DB
 */
export async function saveFocusSession(
  session: Omit<FocusSession, 'id' | 'createdAt' | 'userId'>,
  userId?: string
): Promise<FocusSession> {
  const targetUserId = await ensureUserWorkspace(userId);
  if (!targetUserId) {
    throw new Error('Authentication required to save focus session');
  }

  const created = await prisma.focusSession.create({
    data: {
      userId: targetUserId,
      goalId: session.goalId || null,
      taskId: session.taskId || null,
      taskTitle: session.taskTitle,
      durationMins: session.durationMins,
      completedSteps: session.completedSteps,
      totalSteps: session.totalSteps,
      intervalNumber: session.intervalNumber,
      notes: session.notes || null,
    },
  });

  await prisma.activityHistory.create({
    data: {
      userId: targetUserId,
      goalId: session.goalId || null,
      taskId: session.taskId || null,
      actionType: 'COMPLETE_INTERVAL',
      title: 'Focus session completed',
      description: `Logged ${session.durationMins}m of deep work on "${session.taskTitle}".`,
    },
  });

  return {
    id: created.id,
    userId: created.userId,
    goalId: created.goalId || undefined,
    taskId: created.taskId || undefined,
    taskTitle: created.taskTitle,
    durationMins: created.durationMins,
    completedSteps: created.completedSteps,
    totalSteps: created.totalSteps,
    intervalNumber: created.intervalNumber,
    notes: created.notes || undefined,
    createdAt: created.createdAt.toISOString(),
  };
}

/**
 * Get all focus sessions for a user
 */
export async function getFocusSessions(userId?: string): Promise<FocusSession[]> {
  if (!userId) return [];
  try {
    const sessions = await prisma.focusSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      goalId: s.goalId || undefined,
      taskId: s.taskId || undefined,
      taskTitle: s.taskTitle,
      durationMins: s.durationMins,
      completedSteps: s.completedSteps,
      totalSteps: s.totalSteps,
      intervalNumber: s.intervalNumber,
      notes: s.notes || undefined,
      createdAt: s.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error('Neon DB getFocusSessions failed:', err);
    return [];
  }
}

/**
 * Get Recovery Plan for a goal
 */
export async function getRecoveryPlan(goalId: string, userId?: string): Promise<RecoveryPlan | null> {
  try {
    const plan = await prisma.recoveryPlan.findFirst({
      where: {
        goalId,
        ...(userId ? { goal: { userId } } : {}),
      },
      include: { adjustments: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!plan) return null;

    return {
      id: plan.id,
      goalId: plan.goalId,
      originalTargetDate: plan.originalTargetDate.toISOString(),
      projectedSlipDays: plan.projectedSlipDays,
      recoveredDays: plan.recoveredDays,
      status: plan.status as any,
      simulationNotes: plan.simulationNotes || undefined,
      createdAt: plan.createdAt.toISOString(),
      appliedAt: plan.appliedAt ? plan.appliedAt.toISOString() : undefined,
      adjustments: plan.adjustments.map((a) => ({
        id: a.id,
        recoveryPlanId: a.recoveryPlanId,
        title: a.title,
        milestoneTitle: a.milestoneTitle || undefined,
        taskTitle: a.taskTitle || undefined,
        recoveryDays: a.recoveryDays,
        resourceRequirement: a.resourceRequirement || undefined,
        tradeoff: a.tradeoff || undefined,
        isSelected: a.isSelected,
      })),
    };
  } catch (err) {
    console.error('Neon DB getRecoveryPlan failed:', err);
    return null;
  }
}

/**
 * Apply a Recovery Plan atomically in Neon PostgreSQL
 */
export async function applyRecoveryPlan(
  goalId: string,
  planId: string,
  selectedAdjustmentIds: string[],
  userId?: string
): Promise<{ success: boolean; recoveredDays: number; message: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.recoveryPlan.findUnique({
        where: { id: planId },
        include: { adjustments: true, goal: true },
      });

      if (!plan) throw new Error('Recovery plan not found');
      if (userId && plan.goal.userId !== userId) {
        throw new Error('Unauthorized');
      }

      let recovered = 0;
      for (const adj of plan.adjustments) {
        const isSelected = selectedAdjustmentIds.includes(adj.id);
        await tx.recoveryAdjustment.update({
          where: { id: adj.id },
          data: { isSelected },
        });
        if (isSelected) recovered += adj.recoveryDays;
      }

      await tx.recoveryPlan.update({
        where: { id: planId },
        data: {
          recoveredDays: recovered,
          status: 'APPLIED',
          appliedAt: new Date(),
        },
      });

      await tx.activityHistory.create({
        data: {
          userId: plan.goal.userId,
          goalId: plan.goalId,
          actionType: 'APPLY_RECOVERY',
          title: 'Recovery adjustments applied',
          description: `Recovered ${recovered.toFixed(1)} projected slip days across ${selectedAdjustmentIds.length} adjustment(s).`,
        },
      });

      return recovered;
    });

    return {
      success: true,
      recoveredDays: result,
      message: `Successfully recovered ${result.toFixed(1)} days`,
    };
  } catch (err: any) {
    console.error('Neon DB applyRecoveryPlan failed:', err);
    return {
      success: false,
      recoveredDays: 0,
      message: err.message || 'Failed to apply recovery plan',
    };
  }
}

/**
 * Get user settings from Neon DB
 */
export async function getUserSettings(userId?: string): Promise<UserSettings> {
  const defaultSettings: UserSettings = {
    id: 'settings_default',
    userId: userId || 'user_default',
    timezone: 'Pacific Time (US & Canada) UTC-07:00',
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    focusDurationMins: 25,
    shortBreakMins: 5,
    longBreakMins: 15,
    dailySessionTarget: 4,
    ambientSound: 'Rain & Forest',
    chimesEnabled: true,
    aiModelPreference: 'openai/gpt-oss-120b',
    autoRecoveryThreshold: 3,
    emailNotifications: true,
    scheduleAlerts: true,
    updatedAt: new Date().toISOString(),
  };

  if (!userId) return defaultSettings;

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (settings) {
      return {
        id: settings.id,
        userId: settings.userId,
        timezone: settings.timezone,
        workingHoursStart: settings.workingHoursStart,
        workingHoursEnd: settings.workingHoursEnd,
        focusDurationMins: settings.focusDurationMins,
        shortBreakMins: settings.shortBreakMins,
        longBreakMins: settings.longBreakMins,
        dailySessionTarget: settings.dailySessionTarget,
        ambientSound: settings.ambientSound,
        chimesEnabled: settings.chimesEnabled,
        aiModelPreference: settings.aiModelPreference,
        autoRecoveryThreshold: settings.autoRecoveryThreshold,
        emailNotifications: settings.emailNotifications,
        scheduleAlerts: settings.scheduleAlerts,
        updatedAt: settings.updatedAt.toISOString(),
      };
    }
  } catch (err) {
    console.error('Neon DB getUserSettings failed:', err);
  }

  return defaultSettings;
}

/**
 * Update user settings in Neon DB
 */
export async function updateUserSettings(
  updates: Partial<UserSettings>,
  userId?: string
): Promise<UserSettings> {
  const targetUserId = await ensureUserWorkspace(userId);
  if (!targetUserId) {
    throw new Error('Authentication required to update settings');
  }

  const updated = await prisma.userSettings.upsert({
    where: { userId: targetUserId },
    update: {
      ...(updates.timezone ? { timezone: updates.timezone } : {}),
      ...(updates.workingHoursStart ? { workingHoursStart: updates.workingHoursStart } : {}),
      ...(updates.workingHoursEnd ? { workingHoursEnd: updates.workingHoursEnd } : {}),
      ...(updates.focusDurationMins !== undefined
        ? { focusDurationMins: Number(updates.focusDurationMins) }
        : {}),
      ...(updates.shortBreakMins !== undefined
        ? { shortBreakMins: Number(updates.shortBreakMins) }
        : {}),
      ...(updates.longBreakMins !== undefined ? { longBreakMins: Number(updates.longBreakMins) } : {}),
      ...(updates.dailySessionTarget !== undefined
        ? { dailySessionTarget: Number(updates.dailySessionTarget) }
        : {}),
      ...(updates.ambientSound ? { ambientSound: updates.ambientSound } : {}),
      ...(updates.chimesEnabled !== undefined ? { chimesEnabled: Boolean(updates.chimesEnabled) } : {}),
      ...(updates.aiModelPreference ? { aiModelPreference: updates.aiModelPreference } : {}),
      ...(updates.autoRecoveryThreshold !== undefined
        ? { autoRecoveryThreshold: Number(updates.autoRecoveryThreshold) }
        : {}),
      ...(updates.emailNotifications !== undefined
        ? { emailNotifications: Boolean(updates.emailNotifications) }
        : {}),
      ...(updates.scheduleAlerts !== undefined
        ? { scheduleAlerts: Boolean(updates.scheduleAlerts) }
        : {}),
    },
    create: {
      userId: targetUserId,
      timezone: updates.timezone || 'Pacific Time (US & Canada) UTC-07:00',
      workingHoursStart: updates.workingHoursStart || '09:00',
      workingHoursEnd: updates.workingHoursEnd || '18:00',
      focusDurationMins: updates.focusDurationMins ? Number(updates.focusDurationMins) : 25,
      shortBreakMins: updates.shortBreakMins ? Number(updates.shortBreakMins) : 5,
      longBreakMins: updates.longBreakMins ? Number(updates.longBreakMins) : 15,
      dailySessionTarget: updates.dailySessionTarget ? Number(updates.dailySessionTarget) : 4,
      ambientSound: updates.ambientSound || 'Rain & Forest',
      chimesEnabled: updates.chimesEnabled !== undefined ? Boolean(updates.chimesEnabled) : true,
      aiModelPreference: updates.aiModelPreference || 'openai/gpt-oss-120b',
      autoRecoveryThreshold: updates.autoRecoveryThreshold ? Number(updates.autoRecoveryThreshold) : 3,
      emailNotifications:
        updates.emailNotifications !== undefined ? Boolean(updates.emailNotifications) : true,
      scheduleAlerts: updates.scheduleAlerts !== undefined ? Boolean(updates.scheduleAlerts) : true,
    },
  });

  return {
    id: updated.id,
    userId: updated.userId,
    timezone: updated.timezone,
    workingHoursStart: updated.workingHoursStart,
    workingHoursEnd: updated.workingHoursEnd,
    focusDurationMins: updated.focusDurationMins,
    shortBreakMins: updated.shortBreakMins,
    longBreakMins: updated.longBreakMins,
    dailySessionTarget: updated.dailySessionTarget,
    ambientSound: updated.ambientSound,
    chimesEnabled: updated.chimesEnabled,
    aiModelPreference: updated.aiModelPreference,
    autoRecoveryThreshold: updated.autoRecoveryThreshold,
    emailNotifications: updated.emailNotifications,
    scheduleAlerts: updated.scheduleAlerts,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

/**
 * Update a goal's target date or metadata, dynamically adjusting milestones and metrics
 */
export async function updateGoal(
  goalId: string,
  updates: {
    title?: string;
    description?: string;
    category?: string;
    targetDate?: string;
  },
  userId: string
): Promise<Goal | null> {
  try {
    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      include: { milestones: { orderBy: { phaseNumber: 'asc' } }, tasks: true },
    });

    if (!existing) return null;

    let newTargetDate: Date | undefined;
    if (updates.targetDate) {
      newTargetDate = new Date(updates.targetDate);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Goal record
      await tx.goal.update({
        where: { id: goalId },
        data: {
          ...(updates.title ? { title: updates.title.trim() } : {}),
          ...(updates.description ? { description: updates.description.trim() } : {}),
          ...(updates.category ? { category: updates.category.trim() } : {}),
          ...(newTargetDate ? { targetDate: newTargetDate } : {}),
        },
      });

      // 2. If targetDate changed, adjust milestone dates proportionally
      if (newTargetDate && existing.milestones.length > 0) {
        const goalStartMs = existing.createdAt.getTime();
        const newTotalDurationMs = Math.max(86400000, newTargetDate.getTime() - goalStartMs);
        const totalMilestones = existing.milestones.length;

        for (let i = 0; i < totalMilestones; i++) {
          const ms = existing.milestones[i];
          const msTargetDate = new Date(goalStartMs + Math.round((newTotalDurationMs * (i + 1)) / totalMilestones));
          await tx.milestone.update({
            where: { id: ms.id },
            data: { targetDate: msTargetDate },
          });
        }
      }

      // 3. Record Activity History
      await tx.activityHistory.create({
        data: {
          userId,
          goalId,
          actionType: 'UPDATE_TASK',
          title: 'Goal Timeline Adjusted',
          description: newTargetDate
            ? `Target completion date updated to ${newTargetDate.toLocaleDateString('en-IN')}. Plan and milestones rebalanced.`
            : `Goal details updated for "${existing.title}".`,
        },
      });
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    invalidateGoalsCache(userId);
    return getGoalById(goalId, userId);
  } catch (err) {
    console.error('Error updating goal in Neon DB:', err);
    return null;
  }
}

/**
 * Delete a single goal and its cascade children, enforcing user ownership
 */
export async function deleteGoal(goalId: string, userId?: string): Promise<boolean> {
  try {
    const result = await prisma.goal.deleteMany({
      where: {
        id: goalId,
        ...(userId ? { userId } : {}),
      },
    });
    if (result.count > 0 && userId) {
      invalidateGoalsCache(userId);
    }
    return result.count > 0;
  } catch (err) {
    console.error('Error deleting goal from Neon DB:', err);
    return false;
  }
}

/**
 * Delete all goals and tasks for an authenticated user
 */
export async function deleteAllGoals(userId?: string): Promise<boolean> {
  if (!userId) return false;
  try {
    await prisma.goal.deleteMany({
      where: { userId },
    });
    invalidateGoalsCache(userId);
    return true;
  } catch (err) {
    console.error('Error deleting all goals from Neon DB:', err);
    return false;
  }
}

/**
 * Create a new task within a goal/milestone, enforcing user ownership
 */
export async function createTask(
  goalId: string,
  taskData: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    estimatedMins?: number;
    milestoneId?: string;
    dueDate?: string;
    assigneeName?: string;
    assigneeRole?: string;
  },
  userId?: string
): Promise<Task | null> {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, ...(userId ? { userId } : {}) },
      include: { milestones: { orderBy: { phaseNumber: 'asc' } }, tasks: true },
    });
    if (!goal) return null;

    let milestoneId = taskData.milestoneId;
    if (!milestoneId) {
      milestoneId = goal.milestones[0]?.id;
      if (!milestoneId) {
        const ms = await prisma.milestone.create({
          data: {
            goalId: goal.id,
            title: 'Phase 1: Execution',
            phaseNumber: 1,
            progress: 0,
            status: 'IN_PROGRESS',
          },
        });
        milestoneId = ms.id;
      }
    }

    const maxOrder = goal.tasks.reduce((max, t) => Math.max(max, t.order || 0), 0);

    let defaultAssignee = 'Workspace Member';
    let defaultRole = 'Contributor';
    const user = await prisma.user.findUnique({ where: { id: goal.userId } });
    if (user?.name) defaultAssignee = user.name;
    if (user?.role) defaultRole = user.role;

    const created = await prisma.task.create({
      data: {
        goalId: goal.id,
        milestoneId,
        title: taskData.title.trim(),
        description: taskData.description?.trim() || '',
        priority: (taskData.priority?.toUpperCase() as any) || 'MEDIUM',
        status: (taskData.status as any) || 'READY',
        estimatedMins: Number(taskData.estimatedMins) || 30,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        order: maxOrder + 1,
        assigneeName: taskData.assigneeName || defaultAssignee,
        assigneeRole: taskData.assigneeRole || defaultRole,
      },
      include: {
        checklistItems: true,
        prerequisites: true,
        downstream: true,
      },
    });

    await prisma.activityHistory.create({
      data: {
        userId: goal.userId,
        goalId: goal.id,
        taskId: created.id,
        actionType: 'CREATE_TASK',
        title: 'Task Created',
        description: `Created task "${created.title}"`,
      },
    });

    // Recalculate milestone progress
    const msTasks = await prisma.task.findMany({ where: { milestoneId } });
    const msProgress = calculateMilestoneProgress(msTasks);
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        progress: msProgress,
        status: msProgress === 100 ? 'COMPLETED' : msProgress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      },
    });

    return {
      id: created.id,
      goalId: created.goalId,
      milestoneId: created.milestoneId || '',
      title: created.title,
      description: created.description || '',
      status: created.status as any,
      priority: created.priority as any,
      estimatedMins: created.estimatedMins,
      loggedMins: created.loggedMins,
      dueDate: created.dueDate?.toISOString(),
      isNextStep: created.isNextStep,
      order: created.order,
      assigneeName: created.assigneeName || defaultAssignee,
      assigneeRole: created.assigneeRole || defaultRole,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      assignee: {
        name: created.assigneeName || defaultAssignee,
        role: created.assigneeRole || defaultRole,
        avatar: created.assigneeAvatar || undefined,
      },
      checklist: [],
      prerequisiteTaskIds: [],
      dependentTaskIds: [],
    };
  } catch (err) {
    console.error('Error creating task in Neon DB:', err);
    return null;
  }
}

/**
 * Delete a single task, enforcing user ownership
 */
export async function deleteTask(taskId: string, userId?: string): Promise<boolean> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { goal: true },
    });
    if (!task) return false;
    if (userId && task.goal.userId !== userId) return false;

    await prisma.task.delete({
      where: { id: taskId },
    });

    if (task.milestoneId) {
      const remainingTasks = await prisma.task.findMany({
        where: { milestoneId: task.milestoneId },
      });
      const progress = calculateMilestoneProgress(remainingTasks);
      await prisma.milestone.update({
        where: { id: task.milestoneId },
        data: {
          progress,
          status: progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        },
      });
    }

    return true;
  } catch (err) {
    console.error('Error deleting task from Neon DB:', err);
    return false;
  }
}

/**
 * Create a new milestone within a goal
 */
export async function createMilestone(
  goalId: string,
  data: { title: string; description?: string; targetDate?: string },
  userId?: string
): Promise<Milestone | null> {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, ...(userId ? { userId } : {}) },
      include: { milestones: true },
    });
    if (!goal) return null;

    const count = goal.milestones.length;
    const ms = await prisma.milestone.create({
      data: {
        goalId: goal.id,
        title: data.title.trim(),
        description: data.description?.trim() || '',
        phaseNumber: count + 1,
        progress: 0,
        status: count === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
      },
    });

    return {
      id: ms.id,
      goalId: ms.goalId,
      title: ms.title,
      description: ms.description || undefined,
      phaseNumber: ms.phaseNumber,
      progress: ms.progress,
      status: ms.status as any,
      targetDate: ms.targetDate?.toISOString(),
    };
  } catch (err) {
    console.error('Error creating milestone in Neon DB:', err);
    return null;
  }
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(milestoneId: string, userId?: string): Promise<boolean> {
  try {
    const ms = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { goal: true },
    });
    if (!ms) return false;
    if (userId && ms.goal.userId !== userId) return false;

    await prisma.milestone.delete({
      where: { id: milestoneId },
    });
    return true;
  } catch (err) {
    console.error('Error deleting milestone from Neon DB:', err);
    return false;
  }
}

/**
 * Add a checklist item to a task
 */
export async function addChecklistItem(
  taskId: string,
  title: string,
  userId?: string
): Promise<ChecklistItem | null> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { goal: true, checklistItems: true },
    });
    if (!task) return null;
    if (userId && task.goal.userId !== userId) return null;

    const count = task.checklistItems.length;
    const item = await prisma.checklistItem.create({
      data: {
        taskId,
        title: title.trim(),
        isCompleted: false,
        order: count + 1,
      },
    });

    return {
      id: item.id,
      taskId: item.taskId,
      title: item.title,
      isCompleted: item.isCompleted,
      order: item.order,
    };
  } catch (err) {
    console.error('Error adding checklist item to Neon DB:', err);
    return null;
  }
}

/**
 * Delete a checklist item
 */
export async function deleteChecklistItem(itemId: string, userId?: string): Promise<boolean> {
  try {
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { task: { include: { goal: true } } },
    });
    if (!item) return false;
    if (userId && item.task.goal.userId !== userId) return false;

    await prisma.checklistItem.delete({
      where: { id: itemId },
    });
    return true;
  } catch (err) {
    console.error('Error deleting checklist item from Neon DB:', err);
    return false;
  }
}

/**
 * Create a manual goal directly in Neon DB without AI
 */
export async function createManualGoal(
  data: {
    title: string;
    description?: string;
    category?: string;
    targetDate?: string;
    milestoneTitle?: string;
  },
  userId?: string
): Promise<Goal | null> {
  const targetUserId = await ensureUserWorkspace(userId);
  if (!targetUserId) {
    throw new Error('Authentication required to create a manual goal');
  }

  try {
    const targetDate = data.targetDate
      ? new Date(data.targetDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const goal = await prisma.$transaction(async (tx) => {
      const g = await tx.goal.create({
        data: {
          id: 'goal_' + Date.now(),
          userId: targetUserId,
          title: data.title.trim(),
          description: data.description?.trim() || `Goal: ${data.title}`,
          category: data.category || 'Strategic Initiative',
          status: 'ON_TRACK',
          progress: 0,
          targetDate,
          effortAllocatedHours: 40,
          effortSpentHours: 0,
        },
      });

      await tx.milestone.create({
        data: {
          goalId: g.id,
          title: data.milestoneTitle?.trim() || 'Phase 1: Planning & Setup',
          phaseNumber: 1,
          progress: 0,
          status: 'NOT_STARTED',
        },
      });

      await tx.activityHistory.create({
        data: {
          userId: targetUserId,
          goalId: g.id,
          actionType: 'CREATE_GOAL',
          title: 'Goal Established',
          description: `Established goal "${g.title}"`,
        },
      });

      return g;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    invalidateGoalsCache(targetUserId);
    return getGoalById(goal.id, targetUserId);
  } catch (err) {
    console.error('Error creating manual goal in Neon DB:', err);
    return null;
  }
}
