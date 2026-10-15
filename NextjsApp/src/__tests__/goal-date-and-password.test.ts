import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/auth';
import { createGoalFromProposal, updateGoal, getGoalById, deleteGoal } from '../lib/storage';

describe('Goal Date Adjustment & Password Security Tests', () => {
  const testEmail = `test_security_${Date.now()}@test.com`;
  let testUserId = '';
  let createdGoalId = '';

  beforeAll(async () => {
    const passwordHash = await hashPassword('InitialSecret123');
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Security Test User',
        passwordHash,
        timezone: 'India Standard Time (IST) UTC+05:30',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (createdGoalId && testUserId) {
      await deleteGoal(createdGoalId, testUserId);
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }
  });

  it('should verify password hashing and correct verification', async () => {
    const user = await prisma.user.findUnique({ where: { id: testUserId } });
    expect(user).toBeDefined();
    expect(user?.passwordHash).toBeDefined();

    // Verify correct password succeeds
    const isCorrect = await verifyPassword('InitialSecret123', user!.passwordHash!);
    expect(isCorrect).toBe(true);

    // Verify incorrect password fails
    const isWrong = await verifyPassword('WrongPassword', user!.passwordHash!);
    expect(isWrong).toBe(false);

    // Update password hash and verify new password works
    const newHash = await hashPassword('NewUpdatedPassword456');
    await prisma.user.update({
      where: { id: testUserId },
      data: { passwordHash: newHash },
    });

    const isNewValid = await verifyPassword('NewUpdatedPassword456', newHash);
    expect(isNewValid).toBe(true);
  });

  it('should create a goal with target date and adjust plan milestones when target date changes', async () => {
    const initialTarget = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const proposal = {
      title: 'Target Date Rebalance Test',
      category: 'Product Launch',
      targetDate: initialTarget,
      milestones: [
        {
          title: 'Phase 1: Architecture',
          phaseNumber: 1,
          tasks: [{ title: 'Task 1.1', estimatedHours: 4 }],
        },
        {
          title: 'Phase 2: Execution',
          phaseNumber: 2,
          tasks: [{ title: 'Task 2.1', estimatedHours: 6 }],
        },
      ],
    };

    const goal = await createGoalFromProposal(proposal, testUserId);
    expect(goal).toBeDefined();
    expect(goal.id).toBeDefined();
    createdGoalId = goal.id;

    expect(new Date(goal.targetDate).getTime()).toBeCloseTo(new Date(initialTarget).getTime(), -3);
    expect(goal.milestones?.length).toBe(2);

    // Adjust target date to 60 days ahead
    const extendedTarget = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const updated = await updateGoal(createdGoalId, { targetDate: extendedTarget }, testUserId);

    expect(updated).toBeDefined();
    expect(new Date(updated!.targetDate).getTime()).toBeCloseTo(new Date(extendedTarget).getTime(), -3);

    // Milestones should now be proportionally adjusted
    const fetched = await getGoalById(createdGoalId, testUserId);
    expect(fetched).toBeDefined();
    expect(fetched?.milestones?.[0]?.targetDate).toBeDefined();
    expect(fetched?.milestones?.[1]?.targetDate).toBeDefined();

    // The second milestone should be near the end target
    const ms2Date = new Date(fetched!.milestones![1].targetDate!).getTime();
    expect(ms2Date).toBeCloseTo(new Date(extendedTarget).getTime(), -3);
  });
});
