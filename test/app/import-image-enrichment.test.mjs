import { beforeEach, describe, it, vi } from "vitest";
import assert from "node:assert/strict";

let scenario;

describe("import image enrichment", () => {
  beforeEach(() => {
    vi.resetModules();
    scenario = {
      calls: [],
      suggestionsByQuery: {}
    };

    vi.doMock("@/lib/images/suggestions", () => ({
      isStrongSuggestedImageMatch: vi.fn((candidateName, suggestion) => {
        const title = String(suggestion?.title || "").toLowerCase();
        return String(candidateName || "")
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .every((token) => title.includes(token));
      }),
      searchImageSuggestions: vi.fn(async (query) => {
        scenario.calls.push(["searchImageSuggestions", query]);
        return scenario.suggestionsByQuery[query] || [];
      })
    }));
  });

  it("prefers source-context image matches over generic candidate portraits", async () => {
    const { buildImportImageSearchContext, fillMissingImportImages } = await import("../../lib/pools/internal/import-image-enrichment.js");
    const source = {
      pageTitle: "The Most Brutal Face Scans From NHL 27",
      prompt: "Import players from this NHL 27 face scans article."
    };
    const candidate = {
      name: "Charlie McAvoy",
      description: "Bruins defenseman mentioned as having one of the worst NHL 27 face scan results.",
      imageUrl: null,
      imageSearchContext: buildImportImageSearchContext(source)
    };
    const expectedQuery = "Charlie McAvoy brutal face scans nhl nhl face";
    scenario.suggestionsByQuery[expectedQuery] = [
      {
        title: "Charlie McAvoy official portrait",
        imageUrl: "https://images.example/mcavoy-portrait.jpg",
        source: "Wikipedia"
      },
      {
        title: "Charlie McAvoy NHL 27 face scan comparison",
        imageUrl: "https://images.example/mcavoy-face-scan.jpg",
        source: "Openverse"
      }
    ];

    const [enriched] = await fillMissingImportImages([candidate]);

    assert.deepEqual(scenario.calls, [["searchImageSuggestions", expectedQuery]]);
    assert.equal(enriched.imageUrl, "https://images.example/mcavoy-face-scan.jpg");
  });

  it("does not fill contextual imports with generic candidate portraits", async () => {
    const { buildImportImageSearchContext, fillMissingImportImages } = await import("../../lib/pools/internal/import-image-enrichment.js");
    const source = {
      pageTitle: "The Most Brutal Face Scans From NHL 27",
      prompt: "Import players from this NHL 27 face scans article."
    };
    const candidate = {
      name: "Mason Lohrei",
      description: "Bruins forward mentioned as having a poor NHL 27 face scan result.",
      imageUrl: null,
      imageSearchContext: buildImportImageSearchContext(source)
    };
    const expectedQuery = "Mason Lohrei brutal face scans nhl nhl face";
    scenario.suggestionsByQuery[expectedQuery] = [
      {
        title: "Mason Lohrei official portrait",
        imageUrl: "https://images.example/lohrei-portrait.jpg",
        source: "Wikipedia"
      }
    ];

    const [enriched] = await fillMissingImportImages([candidate]);

    assert.deepEqual(scenario.calls, [["searchImageSuggestions", expectedQuery]]);
    assert.equal(enriched.imageUrl, null);
  });
});
