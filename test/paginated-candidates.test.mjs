import assert from "node:assert/strict";
import test from "node:test";

import { mergeInitialCandidatePage } from "../components/pools/candidates/use-paginated-candidates.js";

test("candidate page merge applies saved first-page edits without dropping loaded pages", () => {
  const previousInitialIds = new Set(["a", "b"]);
  const current = [
    { id: "a", imageUrl: "old-image" },
    { id: "b", imageUrl: "second-image" },
    { id: "c", imageUrl: "loaded-later" }
  ];
  const initialPage = [
    { id: "a", imageUrl: "saved-image" },
    { id: "b", imageUrl: "second-image" }
  ];

  assert.deepEqual(mergeInitialCandidatePage(current, previousInitialIds, initialPage), [
    { id: "a", imageUrl: "saved-image" },
    { id: "b", imageUrl: "second-image" },
    { id: "c", imageUrl: "loaded-later" }
  ]);
});

test("candidate page merge removes deleted first-page candidates", () => {
  const current = [{ id: "a" }, { id: "b" }, { id: "c" }];

  assert.deepEqual(mergeInitialCandidatePage(current, new Set(["a", "b"]), [{ id: "a" }]), [
    { id: "a" },
    { id: "c" }
  ]);
});
