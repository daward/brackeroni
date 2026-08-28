import assert from "node:assert/strict";
import { test } from "vitest";

import { getPoolDetailMenuState } from "../../../components/pools/detail/internal/pool-detail-menu-state";

const pool = {
  visibility: "private",
  candidates: [
    { tags: ["nostalgia"], sourceUrl: "https://example.com/list", imageUrl: null },
    { tags: ["animation", "nostalgia"], sourceUrl: null, imageUrl: "https://example.com/image.jpg" }
  ]
};

test("draft pool menu enables actions supported by its content", () => {
  const state = getPoolDetailMenuState({ pool, readOnly: false, isPending: () => false });

  assert.equal(state.tagCount, 2);
  assert.equal(state.sourceCandidateCount, 1);
  assert.equal(state.missingImageCount, 1);
  assert.equal(state.canCopyLink, false);
  assert.equal(state.canImport, true);
  assert.equal(state.canEnrich, true);
  assert.equal(state.canFillImages, true);
  assert.equal(state.canMerge, true);
  assert.equal(state.canArchive, true);
});

test("read-only pools retain their menu but disable mutating actions", () => {
  const state = getPoolDetailMenuState({
    pool: { ...pool, visibility: "public_listed" },
    readOnly: true,
    isPending: () => false
  });

  assert.equal(state.canCopyLink, true);
  assert.equal(state.canImport, false);
  assert.equal(state.canEnrich, false);
  assert.equal(state.canFillImages, false);
  assert.equal(state.canMerge, false);
  assert.equal(state.canArchive, false);
});

test("pending actions cannot be started a second time", () => {
  const state = getPoolDetailMenuState({
    pool,
    readOnly: false,
    isPending: (action) => action === "enrich-candidates" || action === "auto-fill-images"
  });

  assert.equal(state.canEnrich, false);
  assert.equal(state.canFillImages, false);
  assert.equal(state.canMerge, true);
});
