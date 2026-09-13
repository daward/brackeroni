import { describe, it, vi } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "..", "fixtures", "import-pages");

const { compactHtmlForImport } = await import(
  pathToFileURL(path.join(process.cwd(), "lib", "validation", "pool.js"))
);
const { __testing, extractCandidatesWithGeminiForPools } = await import(
  pathToFileURL(path.join(process.cwd(), "lib", "gemini", "extract-pools-v2.js"))
);
const { buildBookmarkletHref } = await import(
  pathToFileURL(path.join(process.cwd(), "components", "import", "bookmarklet-installer.js"))
);

function readFixture(name) {
  return fs.readFileSync(path.join(fixtureDir, name), "utf8");
}

function oversizedCaptureAround(fragment) {
  const noise = "<div>" + "chrome navigation ".repeat(18000) + "</div>";
  return `${noise}\n${fragment}\n${noise}`;
}

describe("import fixture handling", () => {
  it("prompts Gemini to extract image-search result images from raw HTML evidence", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    let requestBody;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      assert.match(String(url), /generativelanguage\.googleapis\.com/);
      requestBody = JSON.parse(options.body);

      return new Response(
        JSON.stringify({
          steps: [{
            type: "model_output",
            content: [{
              type: "text",
              text: JSON.stringify({ candidates: [] })
            }]
          }]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
    });

    try {
      await extractCandidatesWithGeminiForPools({
        prompt: "Import NHL face scan image results.",
        html: '<a href="/imgres?imgurl=https%3A%2F%2Fimages.example%2Fplayer.jpg"><img src="https://thumb.example/player.jpg"></a>',
        urls: [],
        pageUrl: "https://www.google.com/search?udm=2&q=nhl+27+face+scans"
      });
    } finally {
      fetchSpy.mockRestore();
      delete process.env.GEMINI_API_KEY;
    }

    assert.match(requestBody.input, /For image search pages/);
    assert.match(requestBody.input, /data-iurl/);
    assert.match(requestBody.input, /imgurl/);
    assert.match(requestBody.input, /Each candidate label must name one contender only/);
    assert.match(requestBody.input, /do not reuse the same imageUrl/);
    assert.match(requestBody.input, /return imageUrl null when a candidate is clearly supported/);
    assert.match(requestBody.input, /Do not invent image URLs/);
    assert.match(requestBody.input, /candidate label must be the depicted entity's name/);
    assert.match(requestBody.input, /not the page title, social post title, article headline/);
    assert.match(requestBody.input, /reaction, roundup, or roast/);
  });

  it("compacts highlighted structured cards before sending continuation HTML", () => {
    const href = buildBookmarkletHref("https://brackeroni.example", "pool-1", "YouTube Channels");
    const script = decodeURIComponent(href.replace(/^javascript:/, ""));

    assert.match(script, /selectedBlocks\.push\(compactCardHtml\(block\) \|\| block\.outerHTML\)/);
    assert.match(script, /imageUrl: extractImageUrl\(item\) \|\| null/);
    assert.match(
      script,
      /endIndex = Math\.min\(orderedEntries\.length, selectedSlice\.startIndex \+ MAX_CAPTURED_ITEMS\)/
    );
    assert.match(
      script,
      /endIndex = Math\.min\(uniqueItems\.length, selectedSlice\.startIndex \+ maxItems\)/
    );
  });

  it("stores source-page cursors so repeated bookmarklet clicks can continue", () => {
    const href = buildBookmarkletHref("https://brackeroni.example", "pool-1", "Imported List");
    const script = decodeURIComponent(href.replace(/^javascript:/, ""));

    assert.match(script, /const CAPTURE_CURSOR_STORAGE_PREFIX = "brackeroni-import-cursor"/);
    assert.match(script, /readStoredCaptureCursor\(resolvedPoolId, buildSanitizedPageUrl\(\)\)/);
    assert.match(
      script,
      /writeStoredCaptureCursor\(continuationState\.continuePoolId, pageUrl, captureCursor\)/
    );
  });

  it("scrolls generic repeated-list captures instead of reading one mounted viewport", () => {
    const href = buildBookmarkletHref("https://brackeroni.example", "pool-1", "Imported List");
    const script = decodeURIComponent(href.replace(/^javascript:/, ""));

    assert.match(script, /async function collectRepeatedItemHtml/);
    assert.match(script, /appendItems\(selector, seen, uniqueItems\)/);
    assert.match(script, /setScrollTop\(scrollTarget, nextScrollTop\)/);
    assert.match(script, /await collectRepeatedItemHtml\(preferredRoot \|\| document\.body, MAX_CAPTURED_ITEMS, resumeState\)/);
  });

  it("preserves candidate-adjacent image evidence during HTML compaction", () => {
    const cases = [
      {
        name: "tripadvisor-furnas-fragment.html",
        expectedText: ["Caldeira das Furnas", "Ja Se Sabe"],
        expectedImages: ["hot-springs.jpg", "outside-view.jpg"]
      },
      {
        name: "spotify-disney-fragment.html",
        expectedText: ["Let It Go", "I Won't Say"],
        expectedImages: [
          "ab67616d00004851ca5326437aaf22f00b4844ca",
          "ab67616d00004851964203093dc27c95ab6f271f"
        ]
      },
      {
        name: "bga-palmares-fragment.html",
        expectedText: ["Space Base", "Ticket to Ride"],
        expectedImages: ["spacebase/icon/default.png", "tickettoride/icon/default.png"]
      }
    ];

    for (const item of cases) {
      const compacted = compactHtmlForImport(oversizedCaptureAround(readFixture(item.name)));

      assert.ok(compacted.length <= 240000, `${item.name} should respect the HTML import limit`);

      for (const expectedText of item.expectedText) {
        assert.match(
          compacted,
          new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
          `${item.name} should preserve ${expectedText}`
        );
      }

      for (const expectedImage of item.expectedImages) {
        assert.match(
          compacted,
          new RegExp(expectedImage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
          `${item.name} should preserve ${expectedImage}`
        );
      }
    }
  });

  it("covers every captured Brackeroni card when chunking cards with images", () => {
    const cards = Array.from({ length: 85 }, (_, index) => {
      const number = index + 1;
      return [
        '<article data-brackeroni-card="true">',
        `<h3>Candidate ${number}</h3>`,
        `<img src="https://example.com/images/candidate-${number}.jpg" alt="">`,
        "</article>"
      ].join("");
    });
    const chunks = __testing.splitBrackeroniCardHtmlIntoChunks(cards.join(""));

    assert.equal(chunks.length, 3);
    assert.deepEqual(
      chunks.map((chunk) => (chunk.match(/data-brackeroni-card="true"/g) || []).length),
      [40, 40, 5]
    );

    const recombined = chunks.join("");
    for (const number of [1, 40, 41, 80, 85]) {
      assert.match(recombined, new RegExp(`Candidate ${number}`));
      assert.match(recombined, new RegExp(`candidate-${number}\\.jpg`));
    }
  });

  it("merges tags from captured Brackeroni card metadata", () => {
    const candidates = __testing.mergeExtractedTags(
      [{ label: "BanditGames", tags: ["video games"] }],
      [
        '<article data-brackeroni-card="true">',
        "<h3>BanditGames</h3>",
        "<p>Lore â€¢ Retrospectives</p>",
        "</article>"
      ].join("")
    );

    assert.deepEqual(candidates[0].tags, ["video games", "Lore", "Retrospectives"]);
  });

  it("normalizes protocol-relative image URLs extracted for import", () => {
    const candidates = __testing.normalizeCandidates({
      candidates: [
        {
          label: "3Blue1Brown",
          rationale: null,
          score: null,
          imageUrl: "//yt3.googleusercontent.com/avatar=s176-c",
          sourceUrl: null,
          sourceTitle: null,
          excerpt: null,
          tags: null
        }
      ]
    });

    assert.equal(candidates[0].imageUrl, "https://yt3.googleusercontent.com/avatar=s176-c");
  });

  it("normalizes Gemini-returned image search result URLs into direct image URLs", () => {
    const candidates = __testing.normalizeCandidates({
      candidates: [
        {
          label: "NHL Player",
          rationale: null,
          score: null,
          imageUrl: "https://www.google.com/imgres?imgurl=https%3A%2F%2Fimages.example%2Fnhl_27.jpg&imgrefurl=https%3A%2F%2Fsource.example%2Fpost",
          sourceUrl: null,
          sourceTitle: null,
          excerpt: null,
          tags: null
        }
      ]
    });

    assert.equal(candidates[0].imageUrl, "https://images.example/nhl_27.jpg");
  });

  it("rejects grouped candidate labels from Gemini output", () => {
    const candidates = __testing.normalizeCandidates({
      candidates: [
        {
          label: "Benson, Lyon, and Samuelsson",
          rationale: "Mentioned together in a post.",
          score: 0.7,
          imageUrl: "https://images.example/group.jpg",
          sourceUrl: null,
          sourceTitle: null,
          excerpt: null,
          tags: null
        },
        {
          label: "Cole Caufield",
          rationale: null,
          score: 0.9,
          imageUrl: "https://images.example/caufield.jpg",
          sourceUrl: null,
          sourceTitle: null,
          excerpt: null,
          tags: null
        }
      ]
    });

    assert.deepEqual(candidates.map((candidate) => candidate.label), ["Cole Caufield"]);
  });

  it("keeps image-search candidates when Gemini cannot associate an image", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          steps: [{
            type: "model_output",
            content: [{
              type: "text",
              text: JSON.stringify({
                candidates: [
                  {
                    label: "Cale Makar",
                    rationale: "Mentioned in the result text.",
                    score: 0.8,
                    imageUrl: null,
                    sourceUrl: null,
                    sourceTitle: null,
                    excerpt: null,
                    tags: null
                  },
                  {
                    label: "Will Smith",
                    rationale: null,
                    score: 0.9,
                    imageUrl: "https://images.example/will-smith.jpg",
                    sourceUrl: null,
                    sourceTitle: null,
                    excerpt: null,
                    tags: null
                  }
                ]
              })
            }]
          }]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
    });

    try {
      const result = await extractCandidatesWithGeminiForPools({
        prompt: "Import NHL face scan image results.",
        html: "<div>Google image results</div>",
        urls: [],
        pageUrl: "https://www.google.com/search?udm=2&q=nhl+27+face+scans"
      });

      assert.deepEqual(result.candidates.map((candidate) => candidate.label), ["Cale Makar", "Will Smith"]);
      assert.equal(result.candidates[0].imageUrl, null);
    } finally {
      fetchSpy.mockRestore();
      delete process.env.GEMINI_API_KEY;
    }
  });

  it("keeps ordinary article candidates about face scans even when page images are not extractable", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          steps: [{
            type: "model_output",
            content: [{
              type: "text",
              text: JSON.stringify({
                candidates: [
                  {
                    label: "Charlie McAvoy",
                    rationale: "Named in the article as one of the brutal NHL 27 face scans.",
                    score: 0.9,
                    imageUrl: null,
                    sourceUrl: null,
                    sourceTitle: null,
                    excerpt: null,
                    tags: null
                  }
                ]
              })
            }]
          }]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
    });

    try {
      const result = await extractCandidatesWithGeminiForPools({
        prompt: "Import players from this NHL 27 face scans article.",
        text: "Bruins defenseman Charlie McAvoy had one of the worst results of all.",
        urls: [],
        pageUrl: "https://www.hockeyfeed.com/nhl-news/the-most-brutal-face-scans-from-nhl-27"
      });

      assert.deepEqual(result.candidates.map((candidate) => candidate.label), ["Charlie McAvoy"]);
    } finally {
      fetchSpy.mockRestore();
      delete process.env.GEMINI_API_KEY;
    }
  });

  it("drops image-search candidates that reuse one ambiguous image without dropping image-fillable candidates", () => {
    const candidates = __testing.normalizeCandidates(
      {
        candidates: [
          {
            label: "Benson",
            rationale: "Mentioned near a Google image tile.",
            score: 0.8,
            imageUrl: "https://images.example/nhl-collage.jpg",
            sourceUrl: null,
            sourceTitle: null,
            excerpt: null,
            tags: null
          },
          {
            label: "Lyon",
            rationale: "Mentioned near the same Google image tile.",
            score: 0.8,
            imageUrl: "https://images.example/nhl-collage.jpg",
            sourceUrl: null,
            sourceTitle: null,
            excerpt: null,
            tags: null
          },
          {
            label: "Cole Caufield",
            rationale: null,
            score: 0.9,
            imageUrl: "https://images.example/cole-caufield.jpg",
            sourceUrl: null,
            sourceTitle: null,
            excerpt: null,
            tags: null
          },
          {
            label: "Will Smith",
            rationale: "Clearly mentioned in an image result without an extractable URL.",
            score: 0.8,
            imageUrl: null,
            sourceUrl: null,
            sourceTitle: null,
            excerpt: null,
            tags: null
          }
        ]
      },
      { requireImageUrl: true }
    );

    assert.deepEqual(candidates.map((candidate) => candidate.label), ["Cole Caufield", "Will Smith"]);
  });
});
