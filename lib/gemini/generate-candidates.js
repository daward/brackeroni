const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php";
const EN_WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php";
const IMAGE_FILE_EXTENSION_PATTERN = /\.(avif|bmp|gif|jpe?g|png|svg|tiff?|webp)$/i;
const NON_IMAGE_FILE_EXTENSION_PATTERN = /\.(aspx?|docx?|html?|pdf|php|pptx?|txt|xlsx?|zip)$/i;

const generatedCandidateSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { anyOf: [{ type: "string" }, { type: "null" }] },
          imageUrl: { anyOf: [{ type: "string" }, { type: "null" }] },
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
        required: ["name", "description", "imageUrl", "tags"]
      }
    }
  },
  required: ["candidates"]
};

function normalizeLine(value) {
  return String(value || "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .trim();
}

function extractUrlText(value) {
  const text = String(value || "").trim();
  const markdownLinkMatch = text.match(/^\[[^\]]*]\(([^)]+)\)$/);

  if (markdownLinkMatch?.[1]) {
    return markdownLinkMatch[1];
  }

  return text;
}

function unescapeMarkdownUrl(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/\\([\\`*_{}\[\]()#+\-.!|>])/g, "$1");
}

function normalizeWikimediaThumbUrl(url) {
  if (url.hostname !== "upload.wikimedia.org") {
    return url;
  }

  const parts = url.pathname.split("/");
  const thumbIndex = parts.indexOf("thumb");

  if (thumbIndex < 0 || parts.length < thumbIndex + 5) {
    return url;
  }

  const fileName = parts.at(-2);

  if (!fileName) {
    return url;
  }

  const originalParts = [...parts.slice(0, thumbIndex), ...parts.slice(thumbIndex + 1, -2), fileName];
  url.pathname = originalParts.join("/");

  return url;
}

function isWikimediaUploadUrl(value) {
  try {
    return new URL(value).hostname === "upload.wikimedia.org";
  } catch {
    return false;
  }
}

function hasImageFileExtension(url) {
  return IMAGE_FILE_EXTENSION_PATTERN.test(decodeURIComponent(url.pathname));
}

function hasNonImageFileExtension(url) {
  return NON_IMAGE_FILE_EXTENSION_PATTERN.test(decodeURIComponent(url.pathname));
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getWikimediaFileName(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const thumbIndex = parts.indexOf("thumb");
    const fileName = thumbIndex >= 0 ? parts.at(-2) : parts.at(-1);

    return fileName ? decodeURIComponent(fileName) : "";
  } catch {
    return "";
  }
}

function getWikimediaApiUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const project = parts[1];

    return project === "en" ? EN_WIKIPEDIA_API_URL : COMMONS_API_URL;
  } catch {
    return COMMONS_API_URL;
  }
}

function scoreWikimediaImageResult(candidateName, fileName, result) {
  const title = normalizeSearchText(result.title);
  const candidateTokens = normalizeSearchText(candidateName).split(/\s+/).filter(Boolean);
  const fileTokens = normalizeSearchText(fileName).split(/\s+/).filter(Boolean);
  let score = 0;

  if (candidateTokens.length > 0 && candidateTokens.every((token) => title.includes(token))) {
    score += 100;
  }

  score += candidateTokens.filter((token) => title.includes(token)).length * 20;
  score += fileTokens.filter((token) => title.includes(token)).length * 8;

  if (result.imageUrl) {
    score += 10;
  }

  return score;
}

async function resolveWikimediaImageUrl(candidateName, imageUrl) {
  const fileName = getWikimediaFileName(imageUrl);
  const searchTerms = [candidateName, fileName]
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);
  const search = [...new Set(searchTerms)].join(" ");

  if (!search) {
    return null;
  }

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: search,
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url",
    origin: "*"
  });

  try {
    const response = await fetch(`${getWikimediaApiUrl(imageUrl)}?${params.toString()}`, {
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const results = Object.values(payload.query?.pages || {})
      .map((page) => ({
        title: String(page.title || ""),
        imageUrl: normalizeImageUrl(page.imageinfo?.[0]?.url)
      }))
      .filter((page) => page.imageUrl);
    const [bestResult] = results.sort(
      (left, right) => scoreWikimediaImageResult(candidateName, fileName, right) - scoreWikimediaImageResult(candidateName, fileName, left)
    );

    return bestResult?.imageUrl || null;
  } catch {
    return null;
  }
}

function normalizeImageUrl(value) {
  const normalized = unescapeMarkdownUrl(extractUrlText(value))
    .trim()
    .replace(/^<|>$/g, "");

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("//")) {
    return `https:${normalized}`;
  }

  try {
    const url = normalizeWikimediaThumbUrl(new URL(normalized));

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    if (hasNonImageFileExtension(url)) {
      return null;
    }

    if (url.hostname === "upload.wikimedia.org") {
      if (!hasImageFileExtension(url)) {
        return null;
      }

      url.search = "";
      url.hash = "";
    }

    return url.toString();
  } catch {
    return null;
  }
}

async function resolveGeneratedCandidateImageUrls(candidates) {
  return Promise.all(
    candidates.map(async (candidate) => {
      if (!isWikimediaUploadUrl(candidate.imageUrl)) {
        return candidate;
      }

      const resolvedImageUrl = await resolveWikimediaImageUrl(candidate.name, candidate.imageUrl);

      return {
        ...candidate,
        imageUrl: resolvedImageUrl || null
      };
    })
  );
}

function normalizeGeneratedCandidates(value, count) {
  if (!Array.isArray(value?.candidates)) {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }

  const seen = new Set();
  const candidates = [];

  for (const candidate of value.candidates) {
    const name = normalizeLine(candidate.name);
    const key = name.toLowerCase();

    if (!name || seen.has(key)) {
      continue;
    }

    seen.add(key);
    candidates.push({
      name,
      description: candidate.description ? String(candidate.description).trim() : null,
      imageUrl: normalizeImageUrl(candidate.imageUrl),
      sourceUrl: null,
      tags: Array.isArray(candidate.tags)
        ? [...new Set(candidate.tags.map((tag) => normalizeLine(tag)).filter(Boolean))].slice(0, 12)
        : []
    });
  }

  return candidates.slice(0, count);
}

function buildPrompt({ count, includeImages, prompt }) {
  const sections = [
    `Generate exactly ${count} candidates for a Brackeroni pool.`,
    "Each candidate needs a concise display name, an optional one-sentence description, and optional short tags.",
    "Do not invent private personal details or imply that generated fictional candidates are real people.",
    "Return only structured candidate data.",
  ];

  if (includeImages) {
    sections.push(
      "For every candidate, try to include a direct publicly accessible http(s) image URL in imageUrl.",
      "Choose the image source that best fits the subject, such as official sites, studio or label artwork, poster/artwork CDNs, TMDb poster paths, fandom/media wiki assets, or other durable public image hosts.",
      "Use Wikipedia or Wikimedia Commons only when they have a clearly relevant direct image for that specific candidate.",
      "For songs, albums, movies, TV, games, characters, and other pop-culture items, prefer recognizable cover art, poster art, key art, character art, or official stills over generic encyclopedia images.",
      "The URL must point at an image resource or image CDN resource, not a normal article, search, gallery, or webpage.",
      "Do not return PDFs, documents, videos, audio files, or other non-image media.",
      "For Wikimedia upload URLs, use a real image file ending such as .jpg, .jpeg, .png, .gif, .webp, .avif, or .svg.",
      "Return imageUrl as a plain URL string only. Do not wrap it in markdown and do not escape underscores.",
      "Use null only when you cannot provide a plausible direct image URL for that candidate."
    );
  } else {
    sections.push("Use null for every imageUrl.");
  }

  sections.push("", "User instructions:", prompt);

  return sections.join("\n");
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

export async function generateCandidatesWithGemini({ count, includeImages = true, prompt, model }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_NOT_SET");
  }

  const requestBody = {
    model: model || DEFAULT_MODEL,
    input: buildPrompt({ count, includeImages, prompt }),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: generatedCandidateSchema
    },
    store: false
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

  let parsed;
  try {
    parsed = JSON.parse(extractOutputText(await response.json()));
  } catch {
    throw new Error("GEMINI_INVALID_RESPONSE");
  }

  const candidates = await resolveGeneratedCandidateImageUrls(normalizeGeneratedCandidates(parsed, count));

  return {
    candidates,
    generatedImageCount: candidates.filter((candidate) => candidate.imageUrl).length,
    model: requestBody.model
  };
}

export const __testing = {
  normalizeImageUrl,
  normalizeGeneratedCandidates,
  resolveGeneratedCandidateImageUrls
};
