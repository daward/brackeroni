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
          excerpt: { anyOf: [{ type: "string" }, { type: "null" }] }
        },
        required: ["label", "rationale", "score", "imageUrl", "sourceUrl", "sourceTitle", "excerpt"]
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

function normalizeCandidates(value) {
  if (!Array.isArray(value?.candidates)) {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }

  return value.candidates
    .map((candidate) => {
      const label = normalizeLine(String(candidate.label || "").trim());
      const rationale = candidate.rationale ? String(candidate.rationale).trim() : null;
      const excerpt = candidate.excerpt ? String(candidate.excerpt).trim() : null;

      return {
        label,
        description: deriveCandidateDescription({ label, rationale, excerpt }),
        rationale,
        score:
          typeof candidate.score === "number" && Number.isFinite(candidate.score)
            ? Math.max(0, Math.min(1, candidate.score))
            : null,
        imageUrl: candidate.imageUrl ? String(candidate.imageUrl).trim() : null,
        sourceUrl: candidate.sourceUrl ? String(candidate.sourceUrl).trim() : null,
        sourceTitle: candidate.sourceTitle ? String(candidate.sourceTitle).trim() : null,
        excerpt
      };
    })
    .filter((candidate) => candidate.label);
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

async function requestGeminiExtraction({ apiKey, model, prompt, text, html, urls, pageUrl }) {
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
    candidates: normalizeCandidates(parsed),
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
    candidates: dedupeCandidates(result.candidates)
  };
}

