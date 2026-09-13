/**
 * AI-first importer only.
 *
 * Do not add deterministic page/HTML parsers, site-specific extractors, or
 * rule-based fallback trees here. This module should reduce source material,
 * prompt the model, and normalize the model's response.
 *
 * If imports need to improve, put more effort into the prompt and not effort
 * into parsing before the prompt.
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const CHUNK_TEXT_THRESHOLD = 12000;
const CHUNK_LINE_LIMIT = 120;
const BRACKERONI_CARD_CHUNK_SIZE = 40;

const candidatePoolSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          rationale: { anyOf: [{ type: "string" }, { type: "null" }] },
          score: { anyOf: [{ type: "number" }, { type: "null" }] },
          imageUrl: { anyOf: [{ type: "string" }, { type: "null" }] },
          sourceUrl: { anyOf: [{ type: "string" }, { type: "null" }] },
          sourceTitle: { anyOf: [{ type: "string" }, { type: "null" }] },
          excerpt: { anyOf: [{ type: "string" }, { type: "null" }] },
          tags: {
            anyOf: [
              {
                type: "array",
                items: { type: "string" }
              },
              { type: "null" }
            ]
          }
        },
        required: ["label", "rationale", "score", "imageUrl", "sourceUrl", "sourceTitle", "excerpt", "tags"]
      }
    }
  },
  required: ["candidates"]
};

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function collapseWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeLine(value) {
  return String(value || "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .trim();
}

function normalizeCandidateImageUrl(value) {
  let normalized = collapseWhitespace(value)
    .replace(/\\_/g, "_")
    .replace(/^<([^>]+)>$/, "$1");

  if (!normalized) {
    return null;
  }

  const markdownLinkMatch = normalized.match(/^\[.*?\]\((https?:\/\/[^)\s]+)\)$/i);
  if (markdownLinkMatch?.[1]) {
    normalized = markdownLinkMatch[1];
  }

  if (/^\/\//.test(normalized)) {
    return `https:${normalized}`;
  }

  try {
    const url = new URL(normalized);

    for (const paramName of ["imgurl", "mediaurl", "image_url", "url"]) {
      const paramValue = url.searchParams.get(paramName);
      if (!paramValue) {
        continue;
      }

      const decodedValue = decodeHtmlEntities(paramValue);
      if (/^https?:\/\//i.test(decodedValue)) {
        return decodedValue;
      }
    }

    return url.toString();
  } catch {
    return null;
  }
}

function isLikelyGroupedCandidateLabel(value) {
  const normalized = collapseWhitespace(value);

  if (!normalized) {
    return false;
  }

  return /,\s*\S/.test(normalized) || /\b(?:and|or)\b/i.test(normalized);
}

function isImageSearchExtraction({ prompt, pageUrl }) {
  const promptText = collapseWhitespace(prompt).toLowerCase();

  if (/\b(?:image search|image results|picture results|photo results|screenshot results)\b/.test(promptText)) {
    return true;
  }

  if (!pageUrl) {
    return false;
  }

  try {
    const url = new URL(pageUrl);
    const host = url.hostname.toLowerCase();

    return (
      host.endsWith("google.com") &&
      url.pathname === "/search" &&
      (url.searchParams.get("udm") === "2" || url.searchParams.get("tbm") === "isch")
    );
  } catch {
    return false;
  }
}

function removeAmbiguousDuplicateImageCandidates(candidates, enabled) {
  if (!enabled) {
    return candidates;
  }

  const imageCounts = new Map();

  for (const candidate of candidates) {
    const key = collapseWhitespace(candidate.imageUrl).toLowerCase();
    if (!key) {
      continue;
    }

    imageCounts.set(key, (imageCounts.get(key) || 0) + 1);
  }

  return candidates.filter((candidate) => {
    const key = collapseWhitespace(candidate.imageUrl).toLowerCase();
    return !key || imageCounts.get(key) === 1;
  });
}

function decodeCardText(value) {
  return collapseWhitespace(decodeHtmlEntities(String(value || "")));
}

function stripHtml(html) {
  return decodeHtmlEntities(
    String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|section|article|li|ul|ol|h[1-6]|br|tr|td|th)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}

function buildPrompt({ prompt, text, html, urls, pageUrl }) {
  const sections = [
    "Extract a candidate pool from the provided material.",
    "Follow the extraction instructions exactly.",
    "Return only structured candidate data that is directly supported by the sources.",
    "Be exhaustive. If the source contains a list or ranking, include every distinct supported candidate rather than a shortlist.",
    "Preserve image URLs when the source clearly associates an image with a candidate.",
    "For article or list pages, inspect nearby figure, img, picture, source, caption, and link elements around each candidate mention. Prefer the source-page image associated with that candidate over a generic portrait or profile image.",
    "For image search pages, treat each visual result as a candidate when requested and use the candidate-adjacent image evidence from raw HTML.",
    "For image search pages about people, characters, products, places, or objects, the candidate label must be the depicted entity's name, not the page title, social post title, article headline, or reaction/roast/gallery title.",
    "For image search pages, ignore result cards whose only supported label is a platform or publisher headline such as an Instagram post, Facebook post, Reddit thread, Yahoo Sports article, reaction, roundup, or roast.",
    "Each candidate label must name one contender only. Do not create grouped candidates such as 'A, B, and C'. If one result mentions multiple contenders, return separate candidates only when each contender is individually supported.",
    "For image search pages, do not reuse the same imageUrl for more than one candidate. If one image result mentions multiple names, choose the one clearly depicted or omit the ambiguous names.",
    "Look for image evidence in img src, img srcset, data-src, data-iurl, data-ou, data-thumbnail-url, data-thumb-url, encoded JSON-like attributes, and image result link query parameters such as imgurl, mediaurl, image_url, and url.",
    "Prefer the direct full image URL when present; otherwise use the visible thumbnail URL. For image search pages, return imageUrl null when a candidate is clearly supported but the image URL is not extractable. Do not invent image URLs.",
    "Return imageUrl as a plain http(s) URL string only. Do not wrap it in markdown.",
    "Preserve source URLs when the source clearly associates a link with a candidate.",
    "",
    "Extraction instructions:",
    prompt
  ];

  if (pageUrl) {
    sections.push("", `Primary page URL: ${pageUrl}`);
  }

  if (urls.length > 0) {
    sections.push("", "Source URLs:", ...urls.map((url, index) => `${index + 1}. ${url}`));
  }

  if (text) {
    sections.push("", "Plain text source:", text);
  }

  if (html) {
    sections.push("", "HTML converted to text:", stripHtml(html));
    sections.push("", "Raw HTML source:", html);
  }

  return sections.join("\n");
}

function splitTextIntoChunks(text) {
  const normalizedText = String(text || "").replace(/\r/g, "").trim();

  if (!normalizedText) {
    return [];
  }

  if (normalizedText.length <= CHUNK_TEXT_THRESHOLD) {
    return [normalizedText];
  }

  const lines = normalizedText
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length <= CHUNK_LINE_LIMIT) {
    return [normalizedText];
  }

  const chunks = [];

  for (let index = 0; index < lines.length; index += CHUNK_LINE_LIMIT) {
    const chunk = lines.slice(index, index + CHUNK_LINE_LIMIT).join("\n").trim();
    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks.length > 0 ? chunks : [normalizedText];
}

function splitBrackeroniCardHtmlIntoChunks(html, chunkSize = BRACKERONI_CARD_CHUNK_SIZE) {
  const sourceHtml = String(html || "").trim();

  if (!sourceHtml || !sourceHtml.includes('data-brackeroni-card="true"')) {
    return [];
  }

  const cards = sourceHtml.match(/<article data-brackeroni-card="true">[\s\S]*?<\/article>/g) || [];
  if (cards.length <= chunkSize) {
    return cards.length ? [cards.join("")] : [];
  }

  const chunks = [];

  for (let index = 0; index < cards.length; index += chunkSize) {
    const chunk = cards.slice(index, index + chunkSize).join("").trim();
    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

function stripTags(value) {
  return decodeCardText(String(value || "").replace(/<[^>]+>/g, " "));
}

function splitMetadataTags(value) {
  return String(value || "")
    .split(/\s*(?:•|â€¢|\|)\s*/g)
    .map((item) => decodeCardText(item))
    .filter(Boolean)
    .slice(0, 12);
}

function extractBrackeroniCardTagMap(html) {
  const sourceHtml = String(html || "");

  if (!sourceHtml.includes('data-brackeroni-card="true"')) {
    return new Map();
  }

  const cards = sourceHtml.match(/<article data-brackeroni-card="true">[\s\S]*?<\/article>/g) || [];
  const tagMap = new Map();

  for (const card of cards) {
    const titleMatch = card.match(/<h3>([\s\S]*?)<\/h3>/i);
    const metadataMatch = card.match(/<p>([\s\S]*?)<\/p>/i);
    const label = stripTags(titleMatch?.[1] || "");

    if (!label) {
      continue;
    }

    const tags = splitMetadataTags(stripTags(metadataMatch?.[1] || ""));
    if (tags.length === 0) {
      continue;
    }

    tagMap.set(label.toLowerCase(), tags);
  }

  return tagMap;
}

function extractOutputText(payload) {
  const blocks = payload?.steps
    ?.filter((step) => step.type === "model_output")
    .flatMap((step) => step.content || [])
    .filter((content) => content.type === "text");
  const text = blocks?.map((block) => block.text || "").join("\n").trim();

  if (!text) {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }

  return text;
}

function extractUrlCitations(payload) {
  const citations = [];
  const seen = new Set();
  const blocks = payload?.steps
    ?.filter((step) => step.type === "model_output")
    .flatMap((step) => step.content || [])
    .filter((content) => content.type === "text");

  for (const block of blocks || []) {
    for (const annotation of block.annotations || []) {
      if (annotation.type !== "url_citation" || !annotation.url || seen.has(annotation.url)) {
        continue;
      }

      seen.add(annotation.url);
      citations.push({
        url: annotation.url,
        title: annotation.title || null
      });
    }
  }

  return citations;
}

function deriveCandidateDescription({ label, rationale, excerpt }) {
  const normalizedLabel = collapseWhitespace(label);
  const rationaleText = collapseWhitespace(rationale);
  const excerptText = collapseWhitespace(excerpt);
  const fallback = rationaleText || excerptText;

  if (!fallback) {
    return null;
  }

  if (fallback.toLowerCase() === normalizedLabel.toLowerCase()) {
    return null;
  }

  return fallback;
}

function normalizeCandidates(value, options = {}) {
  if (!Array.isArray(value?.candidates)) {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }

  const candidates = value.candidates
    .map((candidate) => {
      const label = normalizeLine(String(candidate.label || "").trim());
      const rationale = candidate.rationale ? String(candidate.rationale).trim() : null;
      const excerpt = candidate.excerpt ? String(candidate.excerpt).trim() : null;

      return {
        label,
        description: deriveCandidateDescription({ label, rationale, excerpt }),
        tags: Array.isArray(candidate.tags)
          ? [...new Set(candidate.tags.map((tag) => normalizeLine(String(tag || "").trim())).filter(Boolean))].slice(0, 12)
          : [],
        rationale,
        score:
          typeof candidate.score === "number" && Number.isFinite(candidate.score)
            ? Math.max(0, Math.min(1, candidate.score))
            : null,
        imageUrl: normalizeCandidateImageUrl(candidate.imageUrl),
        sourceUrl: candidate.sourceUrl ? String(candidate.sourceUrl).trim() : null,
        sourceTitle: candidate.sourceTitle ? String(candidate.sourceTitle).trim() : null,
        excerpt
      };
    })
    .filter((candidate) => candidate.label)
    .filter((candidate) => !isLikelyGroupedCandidateLabel(candidate.label));

  return removeAmbiguousDuplicateImageCandidates(candidates, options.requireImageUrl);
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const deduped = [];

  for (const candidate of candidates) {
    const key = candidate.label.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function mergeExtractedTags(candidates, html) {
  const tagMap = extractBrackeroniCardTagMap(html);

  if (tagMap.size === 0) {
    return candidates;
  }

  return candidates.map((candidate) => {
    const extractedTags = tagMap.get(candidate.label.toLowerCase()) || [];

    if (extractedTags.length === 0) {
      return candidate;
    }

    return {
      ...candidate,
      tags: [...new Set([...(candidate.tags || []), ...extractedTags])].slice(0, 12)
    };
  });
}

async function requestGeminiExtraction({ apiKey, model, prompt, text, html, urls, pageUrl }) {
  const requireImageUrl = isImageSearchExtraction({ prompt, pageUrl });
  const requestBody = {
    model: model || DEFAULT_MODEL,
    input: buildPrompt({ prompt, text, html, urls, pageUrl }),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: candidatePoolSchema
    },
    store: false,
    ...(urls.length > 0 ? { tools: [{ type: "url_context" }] } : {})
  };

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error("GEMINI_UNAVAILABLE");
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }

  return {
    candidates: normalizeCandidates(parsed, { requireImageUrl }),
    citations: extractUrlCitations(payload),
    model: payload.model || requestBody.model
  };
}

export async function extractCandidatesWithGeminiForPools({
  prompt,
  text = null,
  html = null,
  urls = [],
  model,
  pageUrl = null
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_NOT_SET");
  }

  const textChunks = text && !html && urls.length === 0 ? splitTextIntoChunks(text) : [];
  const htmlChunks = html ? splitBrackeroniCardHtmlIntoChunks(html) : [];

  if (textChunks.length > 1) {
    const batchResults = [];

    for (const [index, chunk] of textChunks.entries()) {
      batchResults.push(
        await requestGeminiExtraction({
          apiKey,
          model,
          prompt: `${prompt}\nProcess chunk ${index + 1} of ${textChunks.length}. Be exhaustive within this chunk.`,
          text: chunk,
          html: null,
          urls: [],
          pageUrl
        })
      );
    }

    return {
      candidates: dedupeCandidates(
        mergeExtractedTags(
          batchResults.flatMap((result) => result.candidates),
          html
        )
      ),
      citations: batchResults.flatMap((result) => result.citations),
      model: batchResults[0]?.model || model || DEFAULT_MODEL
    };
  }

  if (htmlChunks.length > 1) {
    const batchResults = [];

    for (const [index, chunk] of htmlChunks.entries()) {
      batchResults.push(
        await requestGeminiExtraction({
          apiKey,
          model,
          prompt: `${prompt}\nProcess chunk ${index + 1} of ${htmlChunks.length}. Every Brackeroni card in this chunk should become a candidate unless it is a true duplicate of another card in this same chunk.`,
          text: null,
          html: chunk,
          urls: [],
          pageUrl
        })
      );
    }

    return {
      candidates: dedupeCandidates(batchResults.flatMap((result) => result.candidates)),
      citations: batchResults.flatMap((result) => result.citations),
      model: batchResults[0]?.model || model || DEFAULT_MODEL
    };
  }

  const result = await requestGeminiExtraction({
    apiKey,
    model,
    prompt,
    text,
    html,
    urls,
    pageUrl
  });

  return {
    ...result,
    candidates: dedupeCandidates(mergeExtractedTags(result.candidates, html))
  };
}

export const __testing = {
  mergeExtractedTags,
  normalizeCandidates,
  splitBrackeroniCardHtmlIntoChunks,
  stripHtml
};

