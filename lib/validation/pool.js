import { z } from "zod";

export const poolCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable()
});

export const poolUpdateSchema = poolCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided."
);

export const poolCandidateAttachSchema = z.object({
  candidateIds: z.array(z.string().uuid()).min(1).max(200)
});

export const poolCandidateRemoveSchema = z.object({
  candidateId: z.string().uuid()
});
