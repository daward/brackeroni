import assert from "node:assert/strict";
import test from "node:test";

import { appendUniqueItems, reconcileInitialPage } from "../lib/pagination/collection.js";

test("reconciling a changed first page preserves later loaded records", () => {
  assert.deepEqual(
    reconcileInitialPage(
      [{ id: "a", name: "old" }, { id: "b" }, { id: "c" }],
      new Set(["a", "b"]),
      [{ id: "a", name: "saved" }]
    ),
    [{ id: "a", name: "saved" }, { id: "c" }]
  );
});

test("appending a page deduplicates records without reordering the existing collection", () => {
  assert.deepEqual(
    appendUniqueItems([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }]),
    [{ id: "a" }, { id: "b" }, { id: "c" }]
  );
});
