// Deterministic AI Fallback Plan Generator
// Produces comprehensive, structured, phase-divided roadmaps when Groq is unconfigured or unreachable.
import { GeneratedPlanProposal, PriorityLevel } from '../types';

export function generateDeterministicPlan(
  goalTitle: string,
  timeframeWeeks?: number,
  targetDate?: string
): GeneratedPlanProposal {
  const normalized = goalTitle.toLowerCase().trim();
  const weeks = timeframeWeeks || 6;

  // Pattern detection for domain-specific tailored templates
  if (normalized.includes('app') || normalized.includes('mobile') || normalized.includes('software') || normalized.includes('beta')) {
    return {
      provider: 'deterministic_fallback',
      modelUsed: 'deterministic-heuristic-v1',
      title: goalTitle,
      category: 'Product Launch',
      suggestedDurationWeeks: weeks,
      targetDate,
      milestones: [
        {
          title: 'Phase 1: Architecture & Foundation',
          description: 'Establish repository structure, authentication scaffolding, and core schemas.',
          phaseNumber: 1,
          tasks: [
            {
              title: 'API and schema contracts definition',
              description: 'Define relational entities, data contracts, and client-server interfaces.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 6,
            },
            {
              title: 'Core client auth & session management',
              description: 'Implement token persistence, refresh mechanics, and protected route handlers.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 8,
              prerequisiteTaskTitles: ['API and schema contracts definition'],
            },
            {
              title: 'Design token alignment and UI shell setup',
              description: 'Configure typography, color tokens, and navigation rail matching specs.',
              priority: 'MEDIUM' as PriorityLevel,
              estimatedHours: 4,
            },
          ],
        },
        {
          title: 'Phase 2: Core User Flows & Offline Sync',
          description: 'Develop the pivotal product loop, caching strategies, and telemetry hooks.',
          phaseNumber: 2,
          tasks: [
            {
              title: 'Implement local caching & persistence layer',
              description: 'Configure local storage engine with optimistic UI updates.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 6,
              prerequisiteTaskTitles: ['Core client auth & session management'],
            },
            {
              title: 'Conflict resolution logic for data sync',
              description: 'Handle timestamp diffing and merge policies for offline changes.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 5,
              prerequisiteTaskTitles: ['Implement local caching & persistence layer'],
            },
            {
              title: 'Finalize beta tester invite email copy',
              description: 'Draft the direct onboarding sequence with redemption instructions and feedback channels.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 2,
            },
            {
              title: 'Configure TestFlight distribution group',
              description: 'Set up beta distribution lists, provisioning profiles, and release tags.',
              priority: 'MEDIUM' as PriorityLevel,
              estimatedHours: 3,
              prerequisiteTaskTitles: ['Finalize beta tester invite email copy'],
            },
          ],
        },
        {
          title: 'Phase 3: QA Verification & Release Readiness',
          description: 'Conduct regression audits, compliance checks, and distribute the candidate build.',
          phaseNumber: 3,
          tasks: [
            {
              title: 'Apple privacy manifest & compliance verification',
              description: 'Audit required reason APIs and bundle compliant privacy declaration.',
              priority: 'URGENT' as PriorityLevel,
              estimatedHours: 4,
              prerequisiteTaskTitles: ['Configure TestFlight distribution group'],
            },
            {
              title: 'End-to-end user acceptance testing pass',
              description: 'Verify all interactive flows, edge case errors, and telemetry metrics.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 5,
              prerequisiteTaskTitles: ['Apple privacy manifest & compliance verification'],
            },
            {
              title: 'TestFlight closed build release',
              description: 'Deploy candidate v1.0.0 to closed cohort of 150 early access users.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 2,
              prerequisiteTaskTitles: ['End-to-end user acceptance testing pass'],
            },
          ],
        },
      ],
    };
  }

  // Pitch / Fundraising / Business Strategy Template
  if (normalized.includes('deck') || normalized.includes('fundrais') || normalized.includes('pitch') || normalized.includes('series')) {
    return {
      provider: 'deterministic_fallback',
      modelUsed: 'deterministic-heuristic-v1',
      title: goalTitle,
      category: 'Fundraising',
      suggestedDurationWeeks: weeks,
      targetDate,
      milestones: [
        {
          title: 'Phase 1: Narrative & Traction Architecture',
          description: 'Extract customer retention figures, growth cohorts, and core market thesis.',
          phaseNumber: 1,
          tasks: [
            {
              title: 'Extract cohort retention & ARR metrics',
              description: 'Pull monthly cohorts and expansion metrics from analytics.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 5,
            },
            {
              title: 'Draft problem-solution deck story arc',
              description: 'Refine executive 10-slide narrative with defensibility moats.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 4,
              prerequisiteTaskTitles: ['Extract cohort retention & ARR metrics'],
            },
          ],
        },
        {
          title: 'Phase 2: Financial Model & Diligence Room',
          description: 'Construct 3-year P&L projection, hiring plan, and tier-one investor target list.',
          phaseNumber: 2,
          tasks: [
            {
              title: 'Build bottom-up 3-year unit economics model',
              description: 'Stress-test CAC, payback period, and headcount scaling scenarios.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 8,
              prerequisiteTaskTitles: ['Draft problem-solution deck story arc'],
            },
            {
              title: 'Prepare clean data room & cap table audit',
              description: 'Organize legal articles, customer references, and IP assignments.',
              priority: 'MEDIUM' as PriorityLevel,
              estimatedHours: 4,
            },
          ],
        },
        {
          title: 'Phase 3: Investor Outreach & Partner Review',
          description: 'Run targeted partner pitches and track lead investor conversations.',
          phaseNumber: 3,
          tasks: [
            {
              title: 'Conduct dry-run pitch with lead advisors',
              description: 'Incorporate tough Q&A feedback and refine objection handling.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 3,
              prerequisiteTaskTitles: ['Build bottom-up 3-year unit economics model'],
            },
            {
              title: 'Dispatch initial batch of 15 targeted partner introductions',
              description: 'Initiate warm outreach to tier-1 thesis-aligned partners.',
              priority: 'HIGH' as PriorityLevel,
              estimatedHours: 4,
              prerequisiteTaskTitles: ['Conduct dry-run pitch with lead advisors'],
            },
          ],
        },
      ],
    };
  }

  // General Adaptive Project Template
  return {
    provider: 'deterministic_fallback',
    modelUsed: 'deterministic-heuristic-v1',
    title: goalTitle,
    category: 'Strategic Initiative',
    suggestedDurationWeeks: weeks,
    targetDate,
    milestones: [
      {
        title: 'Phase 1: Discovery & Strategy Blueprint',
        description: 'Define success criteria, map requirements, and secure core dependencies.',
        phaseNumber: 1,
        tasks: [
          {
            title: `Define target outcomes and constraints for "${goalTitle}"`,
            description: 'Document key milestones, measurable targets, and non-negotiables.',
            priority: 'HIGH' as PriorityLevel,
            estimatedHours: 4,
          },
          {
            title: 'Identify prerequisites and resource allocations',
            description: 'Evaluate required tooling, team members, and weekly capacity.',
            priority: 'MEDIUM' as PriorityLevel,
            estimatedHours: 3,
            prerequisiteTaskTitles: [`Define target outcomes and constraints for "${goalTitle}"`],
          },
        ],
      },
      {
        title: 'Phase 2: Execution & Milestones Implementation',
        description: 'Drive high-impact workstreams and validate weekly progress against milestones.',
        phaseNumber: 2,
        tasks: [
          {
            title: 'Execute primary milestone deliverables',
            description: 'Deliver the core components of the objective in focused focus sessions.',
            priority: 'HIGH' as PriorityLevel,
            estimatedHours: 12,
            prerequisiteTaskTitles: ['Identify prerequisites and resource allocations'],
          },
          {
            title: 'Weekly progress and blocker review',
            description: 'Identify bottlenecks, rebalance dates, and update recovery options.',
            priority: 'MEDIUM' as PriorityLevel,
            estimatedHours: 2,
            prerequisiteTaskTitles: ['Execute primary milestone deliverables'],
          },
        ],
      },
      {
        title: 'Phase 3: Validation, Handoff & Launch',
        description: 'Review final output, verify readiness criteria, and celebrate completion.',
        phaseNumber: 3,
        tasks: [
          {
            title: 'Review final output against initial targets',
            description: 'Confirm all deliverables meet quality, timeline, and outcome criteria.',
            priority: 'HIGH' as PriorityLevel,
            estimatedHours: 4,
            prerequisiteTaskTitles: ['Weekly progress and blocker review'],
          },
          {
            title: 'Publish completion summary & retro learnings',
            description: 'Document learnings and log total focus hours in Insights history.',
            priority: 'LOW' as PriorityLevel,
            estimatedHours: 2,
            prerequisiteTaskTitles: ['Review final output against initial targets'],
          },
        ],
      },
    ],
  };
}
