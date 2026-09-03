import { describe, it } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "..", "fixtures", "import-pages");

const { compactHtmlForImport } = await import(
  pathToFileURL(path.join(process.cwd(), "lib", "validation", "pool.js"))
);
const { __testing } = await import(
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
});
