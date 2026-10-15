// TASKIT Domain & Application Types

export type GoalStatus = 'ON_TRACK' | 'AT_RISK' | 'DELAYED' | 'AHEAD' | 'COMPLETED';
export type MilestoneStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
export type TaskStatus = 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type RecoveryStatus = 'PROPOSED' | 'APPLIED' | 'DISMISSED';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  avatar?: string;
  timezone: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  timezone: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  focusDurationMins: number;
  shortBreakMins: number;
  longBreakMins: number;
  dailySessionTarget: number;
  ambientSound: string;
  chimesEnabled: boolean;
  aiModelPreference: string;
  autoRecoveryThreshold: number;
  emailNotifications: boolean;
  scheduleAlerts: boolean;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  isCriticalPath: boolean;
  dependsOnTaskTitle?: string;
}

export interface Task {
  id: string;
  goalId: string;
  milestoneId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: PriorityLevel;
  estimatedMins: number;
  loggedMins: number;
  dueDate?: string | null;
  isNextStep: boolean;
  order: number;
  assigneeName?: string | null;
  assigneeRole?: string | null;
  assigneeAvatar?: string | null;
  assignee?: {
    name: string;
    role?: string;
    avatar?: string;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
  checklist?: ChecklistItem[];
  checklistItems?: ChecklistItem[];
  prerequisites?: TaskDependency[];
  prerequisiteTaskIds?: string[];
  downstream?: TaskDependency[];
  dependentTaskIds?: string[];
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  phaseNumber: number;
  progress: number;
  targetDate?: string;
  status: MilestoneStatus;
  tasks?: Task[];
}

export interface RecoveryAdjustment {
  id: string;
  recoveryPlanId: string;
  title: string;
  milestoneTitle?: string;
  taskTitle?: string;
  recoveryDays: number;
  resourceRequirement?: string;
  tradeoff?: string;
  isSelected: boolean;
}

export interface RecoveryPlan {
  id: string;
  goalId: string;
  goalTitle?: string;
  originalTargetDate: string;
  projectedSlipDays: number;
  recoveredDays: number;
  status: RecoveryStatus;
  simulationNotes?: string;
  createdAt: string;
  appliedAt?: string;
  adjustments: RecoveryAdjustment[];
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  status: GoalStatus;
  progress: number;
  targetDate: string;
  effortAllocatedHours: number;
  effortSpentHours: number;
  createdAt: string;
  updatedAt: string;
  milestones?: Milestone[];
  tasks?: Task[];
  recoveryPlans?: RecoveryPlan[];
}

export interface FocusSession {
  id: string;
  userId: string;
  goalId?: string;
  goalTitle?: string;
  taskId?: string;
  taskTitle: string;
  durationMins: number;
  completedSteps: number;
  totalSteps: number;
  intervalNumber: number;
  notes?: string;
  createdAt: string;
}

export interface ActivityHistoryItem {
  id: string;
  userId: string;
  goalId?: string;
  goalTitle?: string;
  taskId?: string;
  taskTitle?: string;
  actionType: 'CREATE_GOAL' | 'UPDATE_TASK' | 'COMPLETE_TASK' | 'RECOVERY_APPLIED' | 'FOCUS_SESSION';
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PlanGenerationRequest {
  goalTitle: string;
  timeframeWeeks?: number;
  targetDate?: string;
  capacityHoursPerWeek?: number;
}

export interface GeneratedPlanProposal {
  provider: 'groq' | 'deterministic_fallback';
  modelUsed: string;
  title: string;
  category: string;
  suggestedDurationWeeks: number;
  targetDate?: string;
  milestones: {
    title: string;
    description: string;
    phaseNumber: number;
    tasks: {
      title: string;
      description: string;
      priority: PriorityLevel;
      estimatedHours: number;
      prerequisiteTaskTitles?: string[];
    }[];
  }[];
}
