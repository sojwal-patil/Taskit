'use client';

// Client-side high-speed SWR (Stale-While-Revalidate) store for Goals and Session
import { Goal } from './types';

interface StoreState {
  goals: Goal[] | null;
  goalsTimestamp: number;
  user: any | null;
  userTimestamp: number;
}

const state: StoreState = {
  goals: null,
  goalsTimestamp: 0,
  user: null,
  userTimestamp: 0,
};

const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

const CACHE_TTL_MS = 15000; // 15 seconds

export function getCachedGoals(): Goal[] | null {
  return state.goals;
}

export function setCachedGoals(goals: Goal[]) {
  state.goals = goals;
  state.goalsTimestamp = Date.now();
  notify();
}

export function addCachedGoal(newGoal: Goal) {
  if (state.goals) {
    state.goals = [newGoal, ...state.goals.filter((g) => g.id !== newGoal.id)];
  } else {
    state.goals = [newGoal];
  }
  state.goalsTimestamp = Date.now();
  notify();
}

export function removeCachedGoal(goalId: string) {
  if (state.goals) {
    state.goals = state.goals.filter((g) => g.id !== goalId);
  }
  state.goalsTimestamp = Date.now();
  notify();
}

export function invalidateClientGoals() {
  state.goalsTimestamp = 0;
}

export async function loadGoalsCached(force = false): Promise<Goal[]> {
  const isFresh = state.goals !== null && Date.now() - state.goalsTimestamp < CACHE_TTL_MS;
  if (!force && isFresh && state.goals) {
    return state.goals;
  }

  try {
    const res = await fetch('/api/goals');
    if (res.ok) {
      const data: Goal[] = await res.json();
      state.goals = data;
      state.goalsTimestamp = Date.now();
      notify();
      return data;
    }
  } catch (err) {
    console.error('Error fetching goals:', err);
  }

  return state.goals || [];
}

export async function loadUserCached(force = false) {
  const isFresh = state.user !== null && Date.now() - state.userTimestamp < CACHE_TTL_MS;
  if (!force && isFresh && state.user) {
    return state.user;
  }

  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      state.user = data.user || null;
      state.userTimestamp = Date.now();
      notify();
      return state.user;
    }
  } catch {}

  return state.user;
}

export function subscribeToStore(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}
