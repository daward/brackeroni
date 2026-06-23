import { z } from "zod";

const imageUrlField = z.string().trim().url().max(2048);

export const candidateCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: imageUrlField.optional().nullable()
});

export const candidateUpdateSchema = candidateCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided."
);
