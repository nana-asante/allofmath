import { z } from "zod";

export const AnswerSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("exact"),
      value: z.string().min(1).max(200),
    })
    .strict(),

  z
    .object({
      kind: z.literal("number"),
      value: z.number().finite(),
      tolerance: z.number().finite().nonnegative().default(0),
    })
    .strict(),
]);

export const ProblemSchema = z
  .object({
    id: z.string().regex(/^aom_[a-z0-9_]+$/),
    topic: z.string().min(1).max(60),

    // Seed difficulty: initial guess (static, PR-reviewed)
    // Use seed_difficulty preferred, difficulty as legacy fallback
    seed_difficulty: z.number().int().min(1).max(20).optional(),
    difficulty: z.number().int().min(1).max(20).optional(),

    // Keep raw prompt, but enforce "no accidental whitespace-only"
    prompt: z.string().min(1).max(2000),

    // Optional latex
    prompt_latex: z.string().max(4000).optional(),

    answer: AnswerSchema,

    status: z.enum(["community", "verified"]).default("community"),
    source: z.string().min(1).max(200),
    license: z.string().min(1).max(80),
    author: z.string().min(1).max(80),

    // Optional video solution URL (YouTube, Vimeo, etc.)
    solution_video_url: z.string().url().max(500).optional(),

    // If you use it, validate it
    created_at: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .refine(
    (p) => p.seed_difficulty !== undefined || p.difficulty !== undefined,
    { message: "Either seed_difficulty or difficulty is required" }
  );

export type Problem = z.infer<typeof ProblemSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
