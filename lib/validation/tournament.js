import { z } from "zod";

export const tournamentCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  sourcePoolId: z.string().uuid().optional().nullable(),
  sharingMode: z.enum(["private", "with_friends"]),
  visibility: z
    .enum(["private", "public_listed", "public_unlisted"])
    .optional()
    .default("private"),
  votingAccess: z.enum(["signed_in_only", "anyone"]).optional().default("signed_in_only"),
  playStyle: z.enum(["reseed", "fixed_bracket"]),
  resultMode: z.enum(["winner_only", "full_ranking", "fast_full_rank"]),
  tieBreakMode: z.enum(["higher_seed_wins", "random"])
});

export const tournamentUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    sourcePoolId: z.string().uuid().optional().nullable(),
    sharingMode: z.enum(["private", "with_friends"]).optional(),
    visibility: z.enum(["private", "public_listed", "public_unlisted"]).optional(),
    votingAccess: z.enum(["signed_in_only", "anyone"]).optional(),
    playStyle: z.enum(["reseed", "fixed_bracket"]).optional(),
    resultMode: z.enum(["winner_only", "full_ranking", "fast_full_rank"]).optional(),
    tieBreakMode: z.enum(["higher_seed_wins", "random"]).optional(),
    status: z.enum(["draft", "active", "complete"]).optional(),
    closeCurrentRound: z.boolean().optional(),
    syncWithPool: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");
