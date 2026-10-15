// Groq AI Integration Client (Server-Only)
import Groq from 'groq-sdk';
import { z } from 'zod';
import { GeneratedPlanProposal } from '../types';

// Zod Schema for strict validation of Groq-generated output
const GroqPlanResponseSchema = z.object({
  title: z.string().min(1),
  category: z.string().default('Strategic Initiative'),
  suggestedDurationWeeks: z.number().int().min(1).max(52).default(6),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().default(''),
        phaseNumber: z.number().int().min(1),
        tasks: z.array(
          z.object({
            title: z.string().min(1),
            description: z.string().default(''),
            priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
            estimatedHours: z.number().min(0.5).max(100).default(2),
            prerequisiteTaskTitles: z.array(z.string()).optional(),
          })
        ),
      })
    )
    .min(1),
});

export async function generatePlanWithGroq(
  goalTitle: string,
  timeframeWeeks?: number
): Promise<GeneratedPlanProposal | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key' || apiKey.trim() === '') {
    return null; // Signals to use fallback gracefully
  }

  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  const groq = new Groq({ apiKey });

  const systemPrompt = `You are Taskit's Adaptive Goal Planning Engine.
Your role is to take a user's strategic goal and break it down into an actionable, realistic execution roadmap structured into sequential phases (milestones) and tasks.

REQUIREMENTS:
1. Divide the plan into 2 to 4 phases (milestones).
2. Each milestone must have 2 to 4 actionable, concrete tasks.
3. Provide realistic estimated hours for each task (between 1 and 20 hours).
4. Assign appropriate priorities: 'LOW', 'MEDIUM', 'HIGH', or 'URGENT'.
5. Explicitly specify prerequisiteTaskTitles where a task strictly depends on a previous task. Do NOT create circular dependencies!
6. Return valid JSON only, matching the requested schema. No markdown formatting or extra text outside JSON.`;

  const userPrompt = `Goal: "${goalTitle}"
${timeframeWeeks ? `Target Duration: ${timeframeWeeks} weeks.` : 'Estimate a realistic timeframe between 4 and 8 weeks.'}

Generate a structured execution roadmap as JSON with the following structure:
{
  "title": "${goalTitle}",
  "category": "Product Launch" | "Fundraising" | "Design System" | "Strategic Initiative" | "Personal Goal",
  "suggestedDurationWeeks": number,
  "milestones": [
    {
      "title": "Phase 1: ...",
      "description": "...",
      "phaseNumber": 1,
      "tasks": [
        {
          "title": "...",
          "description": "...",
          "priority": "HIGH" | "MEDIUM" | "LOW" | "URGENT",
          "estimatedHours": number,
          "prerequisiteTaskTitles": ["..."]
        }
      ]
    }
  ]
}`;

  try {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    const rawJson = JSON.parse(content);
    const parsed = GroqPlanResponseSchema.parse(rawJson);

    return {
      provider: 'groq',
      modelUsed: model,
      title: parsed.title,
      category: parsed.category,
      suggestedDurationWeeks: parsed.suggestedDurationWeeks,
      milestones: parsed.milestones,
    };
  } catch (error) {
    console.error('Groq API execution error, falling back to deterministic planner:', error);
    return null;
  }
}
