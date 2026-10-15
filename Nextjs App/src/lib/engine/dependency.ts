// Taskit Dependency and Topological Sorting Engine

export interface DependencyEdge {
  taskId: string;
  dependsOnTaskId: string;
}

/**
 * Checks whether adding a dependency (dependentTaskId depends on prerequisiteTaskId)
 * would introduce a cycle.
 * Returns true if a cycle is detected, false otherwise.
 */
export function wouldIntroduceCycle(
  existingDependencies: DependencyEdge[],
  dependentTaskId: string,
  prerequisiteTaskId: string
): boolean {
  if (dependentTaskId === prerequisiteTaskId) {
    return true;
  }

  // Build adjacency list: node -> array of nodes that depend on it
  const adj = new Map<string, string[]>();
  for (const edge of existingDependencies) {
    if (!adj.has(edge.dependsOnTaskId)) {
      adj.set(edge.dependsOnTaskId, []);
    }
    adj.get(edge.dependsOnTaskId)!.push(edge.taskId);
  }

  // Add the proposed edge: prerequisiteTaskId -> dependentTaskId
  if (!adj.has(prerequisiteTaskId)) {
    adj.set(prerequisiteTaskId, []);
  }
  adj.get(prerequisiteTaskId)!.push(dependentTaskId);

  // If there is any path from dependentTaskId back to prerequisiteTaskId, we have a cycle!
  const visited = new Set<string>();
  const queue: string[] = [dependentTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === prerequisiteTaskId) {
      return true; // Cycle found!
    }
    if (!visited.has(current)) {
      visited.add(current);
      const neighbors = adj.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
  }

  return false;
}

/**
 * Validates a batch of tasks and their proposed dependency edges to ensure no circular references exist.
 */
export function validateNoCircularDependencies(
  taskIds: string[],
  dependencies: DependencyEdge[]
): { valid: boolean; cycle?: string[] } {
  const adj = new Map<string, string[]>();
  for (const id of taskIds) {
    adj.set(id, []);
  }
  for (const dep of dependencies) {
    if (adj.has(dep.dependsOnTaskId)) {
      adj.get(dep.dependsOnTaskId)!.push(dep.taskId);
    }
  }

  const visited = new Map<string, 'unvisited' | 'visiting' | 'visited'>();
  for (const id of taskIds) {
    visited.set(id, 'unvisited');
  }

  const currentPath: string[] = [];

  function dfs(node: string): boolean {
    visited.set(node, 'visiting');
    currentPath.push(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      const state = visited.get(neighbor);
      if (state === 'visiting') {
        currentPath.push(neighbor);
        return true; // Cycle detected
      }
      if (state === 'unvisited') {
        if (dfs(neighbor)) return true;
      }
    }

    visited.set(node, 'visited');
    currentPath.pop();
    return false;
  }

  for (const id of taskIds) {
    if (visited.get(id) === 'unvisited') {
      if (dfs(id)) {
        return { valid: false, cycle: [...currentPath] };
      }
    }
  }

  return { valid: true };
}

/**
 * Determines task readiness given the complete list of tasks and dependencies.
 * A task is blocked if ANY prerequisite task is not completed.
 */
export function computeTaskReadiness(
  tasks: Array<{ id: string; status: string }>,
  dependencies: DependencyEdge[]
): Map<string, { isReady: boolean; blockedBy: string[] }> {
  const statusMap = new Map<string, string>();
  for (const t of tasks) {
    statusMap.set(t.id, t.status);
  }

  const prereqMap = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (!prereqMap.has(dep.taskId)) {
      prereqMap.set(dep.taskId, []);
    }
    prereqMap.get(dep.taskId)!.push(dep.dependsOnTaskId);
  }

  const result = new Map<string, { isReady: boolean; blockedBy: string[] }>();

  for (const t of tasks) {
    const prereqs = prereqMap.get(t.id) || [];
    const incompletePrereqs = prereqs.filter((prereqId) => {
      const st = statusMap.get(prereqId);
      return st !== 'COMPLETED';
    });

    result.set(t.id, {
      isReady: incompletePrereqs.length === 0,
      blockedBy: incompletePrereqs,
    });
  }

  return result;
}
