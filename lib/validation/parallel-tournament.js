import { z } from "zod";

export const parallelTournamentCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  sourcePoolId: z.string().uuid(),
  sharingMode: z.enum(["private", "with_friends"]),
  visibility: z
    .enum(["private", "public_listed", "public_unlisted"])
    .optional()
    .default("private"),
  votingAccess: z.enum(["signed_in_only", "anyone"]).optional().default("signed_in_only"),
  resultMode: z
    .enum(["parallel_full_ranking", "parallel_partial_ranking"])
    .optional()
    .default("parallel_full_ranking"),
  tieBreakMode: z.enum(["higher_seed_wins", "random"]).default("higher_seed_wins")
});

export const parallelTournamentUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    sourcePoolId: z.string().uuid().optional(),
    sharingMode: z.enum(["private", "with_friends"]).optional(),
    visibility: z.enum(["private", "public_listed", "public_unlisted"]).optional(),
    votingAccess: z.enum(["signed_in_only", "anyone"]).optional(),
    resultMode: z.enum(["parallel_full_ranking", "parallel_partial_ranking"]).optional(),
    tieBreakMode: z.enum(["higher_seed_wins", "random"]).optional(),
    status: z.enum(["draft", "active", "complete"]).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");
