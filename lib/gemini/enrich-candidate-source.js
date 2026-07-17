const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const enrichmentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    description: { anyOf: [{ type: "string" }, { type: "null" }] },
    imageUrl: { anyOf: [{ type: "string" }, { type: "null" }] },
    tags: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["description", "imageUrl", "tags"]
};

function collapseWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
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

function buildPrompt({ candidateName, sourceUrl, html }) {
  return [
    "You are enriching one candidate from its own detail page.",
    `Candidate name: ${candidateName}`,
    `Source URL: ${sourceUrl}`,
    "Infer concise, useful tags from the page.",
    "Prefer specific themes, activities, constraints, format, mood, setting, or outcomes.",
    "Avoid generic filler tags like travel, video, outdoors, gear, fun, lifestyle, attraction.",
    "Return 3 to 8 tags when supported; return fewer if the page is weak.",
    "Keep tags short, natural, and human-meaningful.",
    "If the page clearly supports a stronger short description, provide one sentence.",
    "If the page clearly exposes a primary image URL, provide it; otherwise return null.",
    "",
    "Page text:",
    stripHtml(html).slice(0, 40000)
  ].join("\n");
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

function normalizeTags(tags) {
  return [...new Set(
    (Array.isArray(tags) ? tags : [])
      .map((tag) => collapseWhitespace(tag))
      .filter(Boolean)
  )].slice(0, 12);
}

export async function enrichCandidateFromSource({
  candidateName,
  sourceUrl,
  html,
  model
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_NOT_SET");
  }

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      input: buildPrompt({ candidateName, sourceUrl, html }),
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: enrichmentSchema
      },
      store: false
    })
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
    description: collapseWhitespace(parsed.description || "") || null,
    imageUrl: collapseWhitespace(parsed.imageUrl || "") || null,
    tags: normalizeTags(parsed.tags)
  };
}
