import { z } from "zod";

const MAX_PROMPT_LENGTH = 12000;
const MAX_TEXT_LENGTH = 120000;
const MAX_HTML_LENGTH = 240000;
const MAX_URLS = 20;

function collectStructuredHtmlFragments(value, pattern) {
  return [...String(value || "").matchAll(pattern)]
    .map((match) => ({
      html: match[0] || "",
      index: match.index ?? 0
    }))
    .filter((match) => match.html);
}

export function compactHtmlForImport(value) {
  const html = String(value || "").trim();

  if (!html || html.length <= MAX_HTML_LENGTH) {
    return html || null;
  }

  const prioritizedFragmentGroups = [
    collectStructuredHtmlFragments(
      html,
      /<table\b[^>]*class=["'][^"']*wikitable[^"']*["'][\s\S]*?<\/table>/gi
    ),
    collectStructuredHtmlFragments(html, /<table\b[\s\S]*?<\/table>/gi),
    collectStructuredHtmlFragments(html, /<ol\b[\s\S]*?<\/ol>/gi),
    collectStructuredHtmlFragments(html, /<ul\b[\s\S]*?<\/ul>/gi),
    collectStructuredHtmlFragments(html, /<main\b[\s\S]*?<\/main>/gi)
  ];

  const packedFragments = [];
  const seenHtml = new Set();
  let currentLength = 0;

  for (const group of prioritizedFragmentGroups) {
    const orderedGroup = group.sort((left, right) => left.index - right.index);

    for (const fragment of orderedGroup) {
      if (!fragment.html || seenHtml.has(fragment.html)) {
        continue;
      }

      const separatorLength = packedFragments.length > 0 ? 2 : 0;

      if (currentLength + separatorLength + fragment.html.length > MAX_HTML_LENGTH) {
        continue;
      }

      packedFragments.push(fragment.html);
      seenHtml.add(fragment.html);
      currentLength += separatorLength + fragment.html.length;
    }

    if (packedFragments.length > 0) {
      break;
    }
  }

  if (packedFragments.length > 0) {
    return packedFragments.join("\n\n");
  }

  return html.slice(0, MAX_HTML_LENGTH);
}

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
      .transform((value) => compactHtmlForImport(value)),
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
  sourceUrl: z.string().trim().url().max(2048).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(120)).max(12).optional().default([])
});

const poolSourceItemsSchema = z.object({
  type: z.literal("items"),
  items: z.array(poolSourceItemSchema).min(1).max(1000)
});

const poolImportExtractSchema = z.object({
  source: z.union([poolSourceExtractSchema, poolSourceItemsSchema])
});

export const poolCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  visibility: z.enum(["private", "public_listed", "public_unlisted"]).default("private"),
  source: z.union([poolSourceExtractSchema, poolSourceItemsSchema]).optional()
});

export const poolUpdateSchema = poolCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided."
);

export const poolCandidateAttachSchema = z.object({
  candidateIds: z.array(z.string().uuid()).min(1).max(200)
});

export const poolCandidateCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  imageUrl: z.string().trim().url().max(2048).optional().nullable(),
  sourceUrl: z.string().trim().url().max(2048).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(120)).max(12).optional().default([])
});

export const poolMergeSchema = z.object({
  sourcePoolId: z.string().uuid()
});

export const poolImportSchema = z.union([poolMergeSchema, poolImportExtractSchema]);

export const poolTagManagementSchema = z.object({
  removeTag: z.string().trim().min(1).max(120)
});

export const poolTagThresholdCleanupSchema = z.object({
  removeTagsAtOrBelowCount: z.number().int().min(1).max(999)
});

export const poolSourceEnrichmentSchema = z.object({
  enrichFromSourceUrls: z.literal(true)
});
