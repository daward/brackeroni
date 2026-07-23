import { z } from "zod";

const bracketTemplateSlotSchema = z.object({
  id: z.string().uuid().optional(),
  seed: z.number().int().min(1).max(128),
  subSeed: z.number().int().min(0).max(32).default(0),
  tag: z.string().trim().min(1).max(80).optional().nullable(),
  templateSlot: z.number().int().min(0).max(255)
});

const bracketTemplateSubBracketSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  tag: z.string().trim().min(1).max(80).optional().nullable(),
  slotCount: z.number().int().min(2).max(128),
  feedOrder: z.number().int().min(1).max(64).default(1),
  displayOrder: z.number().int().min(0).max(255),
  slots: z.array(bracketTemplateSlotSchema).max(128)
});

export const bracketTemplateCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  subBrackets: z.array(bracketTemplateSubBracketSchema).min(1).max(16)
});

export const bracketTemplateUpdateSchema = bracketTemplateCreateSchema.extend({
  archive: z.literal(true).optional()
});

