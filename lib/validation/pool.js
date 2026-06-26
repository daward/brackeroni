import { z } from "zod";

const MAX_PROMPT_LENGTH = 12000;
const MAX_TEXT_LENGTH = 120000;
const MAX_HTML_LENGTH = 240000;
const MAX_URLS = 20;

const nullableTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .nullable()
  .optional();

const poolSourceExtractSchema = z
  .object({
    type: z.literal("extract"),
    prompt: z.string().trim().min(1).max(MAX_PROMPT_LENGTH),
    pageTitle: z.string().trim().max(300).optional().nullable(),
    pageUrl: z.string().trim().url().max(2048).optional().nullable(),
    text: nullableTrimmedString
      .transform((value) => (value ? value.slice(0, MAX_TEXT_LENGTH) : null)),
    html: nullableTrimmedString
      .transform((value) => (value ? value.slice(0, MAX_HTML_LENGTH) : null)),
    urls: z.array(z.string().trim().url().max(2048)).max(MAX_URLS).optional().default([]),
    model: z.string().trim().min(1).max(120).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.text && !value.html && value.urls.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["text"],
        message: "Provide at least one of text, html, or urls."
      });
    }
  });

const poolSourceItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().url().max(2048).optional().nullable(),
  sourceUrl: z.string().trim().url().max(2048).optional().nullable()
});

const poolSourceItemsSchema = z.object({
  type: z.literal("items"),
  items: z.array(poolSourceItemSchema).min(1).max(1000)
});

export const poolCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  source: z.union([poolSourceExtractSchema, poolSourceItemsSchema]).optional()
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

export const poolMergeSchema = z.object({
  sourcePoolId: z.string().uuid()
});
