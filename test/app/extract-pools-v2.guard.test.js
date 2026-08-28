import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "vitest";

const importerPath = path.join(process.cwd(), "lib", "gemini", "extract-pools-v2.js");
const importerSource = fs.readFileSync(importerPath, "utf8");

test("extract-pools-v2 stays AI-first", () => {
  assert.match(importerSource, /AI-first importer only\./);
  assert.match(
    importerSource,
    /put more effort into the prompt and not effort[\s*]+into parsing before the prompt\./
  );

  const bannedPatterns = [
    "parseHtml",
    "parseTracklist",
    "parseBillboard",
    "parseMetacritic",
    "buildImageHints",
    "enrichCandidatesFromHtml",
    "extractBestImageUrlFromTag"
  ];

  for (const pattern of bannedPatterns) {
    assert.equal(
      importerSource.includes(pattern),
      false,
      `Importer must not reintroduce parser-style helper: ${pattern}`
    );
  }

  const lineCount = importerSource.split(/\r?\n/).length;
  assert.ok(
    lineCount < 500,
    `Importer grew too large (${lineCount} lines). Keep it prompt/model driven.`
  );
});
