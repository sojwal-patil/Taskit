import { describe, it, expect } from 'vitest';
import {
  wouldIntroduceCycle,
  validateNoCircularDependencies,
  computeTaskReadiness,
} from '../lib/engine/dependency';

describe('Dependency Engine', () => {
  it('should detect a self-referential cycle', () => {
    const isCycle = wouldIntroduceCycle([], 'task_1', 'task_1');
    expect(isCycle).toBe(true);
  });

  it('should detect a 2-node cycle', () => {
    // Existing: task_2 depends on task_1 (task_1 -> task_2)
    const existing = [{ taskId: 'task_2', dependsOnTaskId: 'task_1' }];

    // Trying to add: task_1 depends on task_2 (task_2 -> task_1)
    const isCycle = wouldIntroduceCycle(existing, 'task_1', 'task_2');
    expect(isCycle).toBe(true);
  });

  it('should detect a multi-node cycle (A -> B -> C -> A)', () => {
    // B depends on A, C depends on B
    const existing = [
      { taskId: 'B', dependsOnTaskId: 'A' },
      { taskId: 'C', dependsOnTaskId: 'B' },
    ];

    // Adding: A depends on C
    const isCycle = wouldIntroduceCycle(existing, 'A', 'C');
    expect(isCycle).toBe(true);
  });

  it('should allow valid acyclic dependencies', () => {
    const existing = [
      { taskId: 'B', dependsOnTaskId: 'A' },
      { taskId: 'C', dependsOnTaskId: 'B' },
    ];

    // Adding: D depends on C
    const isCycle = wouldIntroduceCycle(existing, 'D', 'C');
    expect(isCycle).toBe(false);
  });

  it('should validate complete task graph for cycles', () => {
    const tasks = ['A', 'B', 'C', 'D'];
    const acyclicEdges = [
      { taskId: 'B', dependsOnTaskId: 'A' },
      { taskId: 'C', dependsOnTaskId: 'A' },
      { taskId: 'D', dependsOnTaskId: 'B' },
    ];

    const result = validateNoCircularDependencies(tasks, acyclicEdges);
    expect(result.valid).toBe(true);

    const cyclicEdges = [
      { taskId: 'B', dependsOnTaskId: 'A' },
      { taskId: 'C', dependsOnTaskId: 'B' },
      { taskId: 'A', dependsOnTaskId: 'C' },
    ];
    const cyclicResult = validateNoCircularDependencies(tasks, cyclicEdges);
    expect(cyclicResult.valid).toBe(false);
  });

  it('should compute task readiness based on prerequisite completion', () => {
    const tasks = [
      { id: 'task_1', status: 'COMPLETED' },
      { id: 'task_2', status: 'IN_PROGRESS' },
      { id: 'task_3', status: 'READY' },
    ];

    // task_2 depends on task_1 (which is COMPLETED)
    // task_3 depends on task_2 (which is IN_PROGRESS)
    const deps = [
      { taskId: 'task_2', dependsOnTaskId: 'task_1' },
      { taskId: 'task_3', dependsOnTaskId: 'task_2' },
    ];

    const readiness = computeTaskReadiness(tasks, deps);

    // task_2 has only task_1 as prereq (which is completed) -> ready
    expect(readiness.get('task_2')?.isReady).toBe(true);
    expect(readiness.get('task_2')?.blockedBy).toHaveLength(0);

    // task_3 has task_2 as prereq (which is NOT completed) -> not ready
    expect(readiness.get('task_3')?.isReady).toBe(false);
    expect(readiness.get('task_3')?.blockedBy).toContain('task_2');
  });
});
