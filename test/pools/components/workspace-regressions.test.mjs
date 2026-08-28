import assert from "node:assert/strict";
import { test } from "vitest";

import { mergeInitialCandidatePage } from "../../../lib/pagination/candidates.js";
import { isGeneratedPoolSourceDescription } from "../../../components/pools/shared";

test("saved candidate image replaces the visible first-page candidate", () => {
  const result = mergeInitialCandidatePage(
    [{ id: "care-bears", imageUrl: "before" }, { id: "pony", imageUrl: "pony" }],
    new Set(["care-bears", "pony"]),
    [{ id: "care-bears", imageUrl: "after" }, { id: "pony", imageUrl: "pony" }]
  );

  assert.equal(result.find((candidate) => candidate.id === "care-bears").imageUrl, "after");
});

test("saving a first-page candidate retains candidates loaded from later pages", () => {
  const result = mergeInitialCandidatePage(
    [{ id: "a" }, { id: "b" }, { id: "loaded-later" }],
    new Set(["a", "b"]),
    [{ id: "a", imageUrl: "saved" }, { id: "b" }]
  );

  assert.deepEqual(result.map((candidate) => candidate.id), ["a", "b", "loaded-later"]);
});

test("generated import descriptions stay inside source information", () => {
  assert.equal(
    isGeneratedPoolSourceDescription("Imported from www.buzzfeed.com", "https://www.buzzfeed.com/list"),
    true
  );
  assert.equal(
    isGeneratedPoolSourceDescription("A hand-written pool description", "https://www.buzzfeed.com/list"),
    false
  );
});
