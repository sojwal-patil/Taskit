import { describe, it, expect, beforeAll } from 'vitest';
import prisma from '../lib/prisma';
import {
  getGoals,
  getGoalById,
  createGoalFromProposal,
  updateTask,
  toggleChecklistItem,
  saveFocusSession,
  getFocusSessions,
  getUserSettings,
  updateUserSettings,
  deleteGoal,
} from '../lib/storage';

describe('Storage & Recovery Workflows', () => {
  let testUserId: string;
  let createdGoalId: string;
  let createdTaskId: string;
  let createdCheckItemId: string;

  beforeAll(async () => {
    // Find or create test user for integration suite
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'ci.test.runner@taskit.internal',
          name: 'CI Test Runner',
          role: 'QA Engineer',
          timezone: 'UTC',
        },
      });
    }
    testUserId = user.id;
  });

  it('should create and persist a new goal from proposal with milestones and tasks', async () => {
    const newGoal = await createGoalFromProposal(
      {
        title: 'Automated CI/CD Integration',
        category: 'Quality Assurance',
        description: 'Production verification and release pipeline.',
        milestones: [
          {
            title: 'Phase 1: Foundation',
            description: 'Harness and runner configuration.',
            phaseNumber: 1,
            tasks: [
              {
                title: 'Configure Vitest and CI pipeline',
                description: 'Install dependencies and configure runner.',
                priority: 'HIGH',
                estimatedHours: 4,
              },
            ],
          },
        ],
      },
      testUserId
    );

    expect(newGoal.id).toBeDefined();
    expect(newGoal.title).toBe('Automated CI/CD Integration');
    expect(newGoal.userId).toBe(testUserId);
    createdGoalId = newGoal.id;

    const fetched = await getGoalById(newGoal.id, testUserId);
    expect(fetched).toBeDefined();
    expect(fetched?.title).toBe('Automated CI/CD Integration');
    expect(fetched?.tasks?.length).toBeGreaterThan(0);

    const firstTask = fetched?.tasks?.[0];
    expect(firstTask).toBeDefined();
    createdTaskId = firstTask!.id;
    if (firstTask?.checklist && firstTask.checklist.length > 0) {
      createdCheckItemId = firstTask.checklist[0].id;
    }
  });

  it('should retrieve goals including the newly created goal', async () => {
    const goals = await getGoals(testUserId);
    expect(Array.isArray(goals)).toBe(true);
    expect(goals.some((g) => g.id === createdGoalId)).toBe(true);
  });

  it('should update task status and toggle checklist items', async () => {
    expect(createdTaskId).toBeDefined();

    // Toggle checklist item if present
    if (createdCheckItemId) {
      const toggled = await toggleChecklistItem(createdTaskId, createdCheckItemId, true, testUserId);
      expect(toggled?.isCompleted).toBe(true);
    }

    // Update task status
    const updated = await updateTask(createdTaskId, { status: 'COMPLETED' }, testUserId);
    expect(updated?.status).toBe('COMPLETED');
  });

  it('should save focus sessions and retrieve history', async () => {
    const session = await saveFocusSession(
      {
        goalId: createdGoalId,
        taskId: createdTaskId,
        taskTitle: 'Automated Test Execution',
        durationMins: 25,
        completedSteps: 2,
        totalSteps: 2,
        intervalNumber: 1,
        notes: 'All integration checks passed cleanly.',
      },
      testUserId
    );

    expect(session.id).toBeDefined();
    expect(session.durationMins).toBe(25);
    expect(session.userId).toBe(testUserId);

    const allSessions = await getFocusSessions(testUserId);
    expect(allSessions.some((s) => s.id === session.id)).toBe(true);
  });

  it('should update and persist user settings', async () => {
    const currentSettings = await getUserSettings(testUserId);
    expect(currentSettings).toBeDefined();

    const updated = await updateUserSettings(
      {
        focusDurationMins: 30,
        ambientSound: 'Forest Stream',
      },
      testUserId
    );

    expect(updated.focusDurationMins).toBe(30);
    expect(updated.ambientSound).toBe('Forest Stream');
  });

  it('should clean up and delete the test goal', async () => {
    if (createdGoalId) {
      const success = await deleteGoal(createdGoalId, testUserId);
      expect(success).toBe(true);
      const deleted = await getGoalById(createdGoalId, testUserId);
      expect(deleted).toBeNull();
    }
  });
});
