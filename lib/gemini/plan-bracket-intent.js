const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const bracketIntentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      description: "A concise, human-readable bracket title. Do not repeat setup words like create, make, bracket, full ranking, public, private, or draft unless they are part of the subject."
    },
    poolName: {
      type: "string",
      description: "A concise reusable pool name for the candidate set."
    }
  },
  required: ["title", "poolName"]
};

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

function normalizeTitle(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "")
    .trim()
    .slice(0, 120);
}

export async function planBracketIntentWithGemini({ prompt, model }) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_NOT_SET");
  }

  const requestBody = {
    model: model || DEFAULT_MODEL,
    input: [
      "Name a Brackeroni bracket from the user's prompt.",
      "Return only structured data.",
      "The title should name the subject, not the whole instruction.",
      "Good examples:",
      "- Prompt: Make a full ranking bracket for 16 Boston brunch spots",
      "  title: Boston Brunch Spots",
      "  poolName: Boston Brunch Spots",
      "- Prompt: create a private winner bracket with Arrival, Alien, Jaws, Heat",
      "  title: Movie Night",
      "  poolName: Movie Night",
      "",
      "User prompt:",
      prompt
    ].join("\n"),
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: bracketIntentSchema
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

  return {
    title: normalizeTitle(parsed.title),
    poolName: normalizeTitle(parsed.poolName)
  };
}
