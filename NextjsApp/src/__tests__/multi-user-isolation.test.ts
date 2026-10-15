import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../lib/prisma';
import {
  getGoals,
  getGoalById,
  createGoalFromProposal,
  deleteGoal,
} from '../lib/storage';

describe('Multi-User Database and Goal Isolation', () => {
  let userAId: string;
  let userBId: string;
  let userAGoalId: string;
  let userBGoalId: string;

  beforeAll(async () => {
    // 1. Create two isolated test users with unique timestamps
    const timestamp = Date.now();
    const userA = await prisma.user.create({
      data: {
        email: `isolation_user_a_${timestamp}@taskit.test`,
        name: 'Alice Isolation',
        role: 'Product Manager',
        timezone: 'UTC',
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        email: `isolation_user_b_${timestamp}@taskit.test`,
        name: 'Bob Isolation',
        role: 'Lead Architect',
        timezone: 'UTC',
      },
    });
    userBId = userB.id;
  });

  afterAll(async () => {
    // Clean up created test goals and users
    if (userAGoalId) {
      await prisma.goal.deleteMany({ where: { id: userAGoalId } });
    }
    if (userBGoalId) {
      await prisma.goal.deleteMany({ where: { id: userBGoalId } });
    }
    if (userAId) {
      await prisma.user.deleteMany({ where: { id: userAId } });
    }
    if (userBId) {
      await prisma.user.deleteMany({ where: { id: userBId } });
    }
  });

  it('freshly created users should have zero goals and see no demo data', async () => {
    const goalsA = await getGoals(userAId);
    const goalsB = await getGoals(userBId);

    expect(goalsA).toEqual([]);
    expect(goalsB).toEqual([]);
    expect(goalsA.length).toBe(0);
    expect(goalsB.length).toBe(0);
  });

  it('user A creates a goal and only user A can see it', async () => {
    const goalA = await createGoalFromProposal(
      {
        title: 'User A Confidential Roadmap',
        category: 'Product Strategy',
        description: 'Classified roadmap for User A organization.',
        milestones: [
          {
            title: 'Q1 Deliverables',
            description: 'Core product launch.',
            phaseNumber: 1,
            tasks: [
              {
                title: 'Review specifications',
                description: 'Verify all isolation criteria.',
                priority: 'HIGH',
                estimatedHours: 2,
              },
            ],
          },
        ],
      },
      userAId
    );

    userAGoalId = goalA.id;

    // Verify User A sees their goal
    const goalsA = await getGoals(userAId);
    expect(goalsA.length).toBe(1);
    expect(goalsA[0].id).toBe(userAGoalId);
    expect(goalsA[0].title).toBe('User A Confidential Roadmap');

    // Verify User B CANNOT see User A's goal in their list
    const goalsB = await getGoals(userBId);
    expect(goalsB.length).toBe(0);

    // Verify User B CANNOT fetch User A's goal directly by ID
    const crossFetch = await getGoalById(userAGoalId, userBId);
    expect(crossFetch).toBeNull();
  });

  it('user B creates a goal and only user B can see it', async () => {
    const goalB = await createGoalFromProposal(
      {
        title: 'User B Cloud Infrastructure Migration',
        category: 'DevOps & SRE',
        description: 'Serverless migration plan for User B.',
        milestones: [
          {
            title: 'Cluster Provisioning',
            description: 'Terraform deployment.',
            phaseNumber: 1,
            tasks: [
              {
                title: 'Deploy Kubernetes pods',
                description: 'Configure pod security standards.',
                priority: 'MEDIUM',
                estimatedHours: 6,
              },
            ],
          },
        ],
      },
      userBId
    );

    userBGoalId = goalB.id;

    // Verify User B sees only their goal
    const goalsB = await getGoals(userBId);
    expect(goalsB.length).toBe(1);
    expect(goalsB[0].id).toBe(userBGoalId);
    expect(goalsB[0].title).toBe('User B Cloud Infrastructure Migration');

    // Verify User A still sees only their goal
    const goalsA = await getGoals(userAId);
    expect(goalsA.length).toBe(1);
    expect(goalsA[0].id).toBe(userAGoalId);

    // Cross-tenant fetch blocked
    const crossFetch = await getGoalById(userBGoalId, userAId);
    expect(crossFetch).toBeNull();
  });

  it('cross-user deletion attempts are strictly prohibited', async () => {
    // User B tries to delete User A's goal
    const unauthorizedDelete = await deleteGoal(userAGoalId, userBId);
    expect(unauthorizedDelete).toBe(false);

    // Confirm User A's goal is still safe and intact in the database
    const intactGoalA = await getGoalById(userAGoalId, userAId);
    expect(intactGoalA).not.toBeNull();
    expect(intactGoalA?.id).toBe(userAGoalId);
  });

  it('authorized deletion deletes only the owners goal leaving others intact', async () => {
    // User A deletes their own goal
    const authorizedDelete = await deleteGoal(userAGoalId, userAId);
    expect(authorizedDelete).toBe(true);

    // User A now has 0 goals
    const goalsA = await getGoals(userAId);
    expect(goalsA.length).toBe(0);

    // User B's goal remains completely untouched
    const goalsB = await getGoals(userBId);
    expect(goalsB.length).toBe(1);
    expect(goalsB[0].id).toBe(userBGoalId);
  });
});
