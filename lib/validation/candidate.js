import { z } from "zod";

const imageUrlField = z.string().trim().url().max(2048);
const candidateTagsField = z.array(z.string().trim().min(1).max(120)).max(12).default([]);

export const candidateCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: imageUrlField.optional().nullable(),
  sourceUrl: imageUrlField.optional().nullable(),
  tags: candidateTagsField.optional()
});

export const candidateUpdateSchema = candidateCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided."
);
