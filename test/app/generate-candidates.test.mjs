// @vitest-environment node

import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";
import { generateCandidatesWithGemini, __testing } from "../../lib/gemini/generate-candidates.js";

describe("AI candidate generation", () => {
  function jsonResponse(body) {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("normalizes markdown-escaped image URLs", () => {
    const url = "[https://upload.wikimedia.org/wikipedia/en/f/f9/TMNT\\_1987\\_title.jpg](https://upload.wikimedia.org/wikipedia/en/f/f9/TMNT\\_1987\\_title.jpg)";

    assert.equal(
      __testing.normalizeImageUrl(url),
      "https://upload.wikimedia.org/wikipedia/en/f/f9/TMNT_1987_title.jpg"
    );
  });

  it("normalizes generated Wikimedia thumbnail URLs to the original file", () => {
    const url = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Coast_Guard_Beach_Eastham.jpg/800px-Coast_Guard_Beach_Eastham.jpg";

    assert.equal(
      __testing.normalizeImageUrl(url),
      "https://upload.wikimedia.org/wikipedia/commons/c/c5/Coast_Guard_Beach_Eastham.jpg"
    );
  });

  it("rejects Wikimedia document URLs", () => {
    const url = "https://upload.wikimedia.org/wikipedia/commons/1/1c/The_inner_circle_-_studies_in_spiritual_and_social_values_%28IA_innercirclestudi00jone%29.pdf?utm_source=en.wikipedia.org";

    assert.equal(__testing.normalizeImageUrl(url), null);
  });

  it("resolves hallucinated Wikimedia upload paths through Wikimedia search", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      assert.match(String(url), /commons\.wikimedia\.org\/w\/api\.php/);

      return jsonResponse({
        query: {
          pages: {
            123: {
              title: "File:Duxbury Beach, Duxbury MA.jpg",
              imageinfo: [{
                url: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Duxbury_Beach%2C_Duxbury_MA.jpg"
              }]
            }
          }
        }
      });
    });

    const [candidate] = await __testing.resolveGeneratedCandidateImageUrls([
      {
        name: "Duxbury Beach",
        description: null,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d7/Duxbury_Beach_MA.jpg",
        sourceUrl: null,
        tags: []
      }
    ]);

    assert.equal(
      candidate.imageUrl,
      "https://upload.wikimedia.org/wikipedia/commons/2/2e/Duxbury_Beach%2C_Duxbury_MA.jpg"
    );
  });

  it("drops Wikimedia search results that resolve to documents", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse({
      query: {
        pages: {
          123: {
            title: "File:The inner circle - studies in spiritual and social values.pdf",
            imageinfo: [{
              url: "https://upload.wikimedia.org/wikipedia/commons/1/1c/The_inner_circle.pdf?utm_source=en.wikipedia.org"
            }]
          }
        }
      }
    }));

    const [candidate] = await __testing.resolveGeneratedCandidateImageUrls([
      {
        name: "The inner circle",
        description: null,
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1c/The_inner_circle.pdf",
        sourceUrl: null,
        tags: []
      }
    ]);

    assert.equal(candidate.imageUrl, null);
  });

  it("preserves normalized generated image URLs without probing them", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("generativelanguage.googleapis.com")) {
        return jsonResponse({
          steps: [{
            type: "model_output",
            content: [{
              type: "text",
              text: JSON.stringify({
                candidates: [
                  {
                    name: "TMNT",
                    description: null,
                    imageUrl: "[https://images.example/TMNT\\_title.jpg](https://images.example/TMNT\\_title.jpg)",
                    tags: []
                  }
                ]
              })
            }]
          }]
        });
      }

      throw new Error("Unexpected image probe.");
    });

    const result = await generateCandidatesWithGemini({ count: 1, includeImages: true, prompt: "cartoons" });

    assert.equal(fetchSpy.mock.calls.length, 1);
    assert.equal(result.generatedImageCount, 1);
    assert.equal(result.candidates[0].imageUrl, "https://images.example/TMNT_title.jpg");
  });

  it("asks for subject-appropriate image sources", async () => {
    let requestBody;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      assert.match(String(url), /generativelanguage\.googleapis\.com/);
      requestBody = JSON.parse(options.body);

      return jsonResponse({
        steps: [{
          type: "model_output",
          content: [{
            type: "text",
            text: JSON.stringify({ candidates: [] })
          }]
        }]
      });
    });

    await generateCandidatesWithGemini({ count: 1, includeImages: true, prompt: "best Disney songs" });

    assert.match(requestBody.input, /studio or label artwork/);
    assert.match(requestBody.input, /For songs, albums, movies, TV, games, characters/);
    assert.doesNotMatch(requestBody.input, /Prefer stable URLs from Wikipedia/);
  });
});
