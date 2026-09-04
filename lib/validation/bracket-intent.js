import { z } from "zod";

const sourcePlanSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("existing_owned_pool"),
    poolId: z.string().uuid()
  }),
  z.object({
    type: z.literal("existing_published_pool"),
    poolId: z.string().uuid()
  }),
  z.object({
    type: z.literal("new_pool_from_items"),
    poolName: z.string().trim().min(1).max(120),
    candidates: z.array(
      z.object({
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(2000).optional().nullable(),
        imageUrl: z.string().trim().url().max(2048).optional().nullable(),
        tags: z.array(z.string().trim().min(1).max(120)).max(12).optional().default([])
      })
    ).min(2).max(1000)
  }),
  z.object({
    type: z.literal("new_pool_from_generation"),
    poolName: z.string().trim().min(1).max(120),
    candidateCount: z.number().int().min(2).max(100),
    prompt: z.string().trim().min(1).max(12000),
    includeImages: z.boolean().optional().default(true)
  })
]);

export const bracketIntentRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(12000),
  action: z.enum(["preview", "create"]).optional().default("preview")
});

export const bracketIntentPlanSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable().default(null),
  source: sourcePlanSchema,
  sharingMode: z.enum(["private", "with_friends"]).default("private"),
  visibility: z.enum(["private", "public_listed", "public_unlisted"]).default("private"),
  votingAccess: z.enum(["signed_in_only", "anyone"]).default("signed_in_only"),
  playStyle: z.enum(["reseed", "fixed_bracket"]).default("fixed_bracket"),
  resultMode: z
    .enum([
      "winner_only",
      "full_ranking",
      "partial_ranking",
      "fast_full_rank",
      "parallel_full_ranking",
      "parallel_partial_ranking"
    ])
    .default("winner_only"),
  tieBreakMode: z.enum(["higher_seed_wins", "random"]).default("higher_seed_wins"),
  advancementMode: z.enum(["vote_winner", "manual_winner"]).default("vote_winner"),
  intentPreset: z.string().trim().min(1).max(120).optional().nullable()
});
