import assert from "node:assert/strict";
import test from "node:test";

import { mergeInitialCandidatePage } from "../components/pools/candidates/use-paginated-candidates.js";
import { getPoolTitlePresentation } from "../components/pools/shared/pool-header-state.js";

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

test("published pools render a static title", () => {
  assert.equal(getPoolTitlePresentation({ isReadOnly: true }), "static");
  assert.equal(getPoolTitlePresentation({ isReadOnly: false }), "editable");
});
