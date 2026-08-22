import assert from "node:assert/strict";
import test from "node:test";

import { filterCandidatesByTag, getCandidateTagSummary } from "../lib/candidate-tags.js";

const candidates = [
  { id: "1", tags: ["animated", "classic"] },
  { id: "2", tags: ["classic"] },
  { id: "3", tags: [] }
];

test("candidate tag summary counts tags and sorts count before name", () => {
  assert.deepEqual(getCandidateTagSummary(candidates), [["classic", 2], ["animated", 1]]);
});

test("candidate tag filtering leaves the full collection intact without a filter", () => {
  assert.strictEqual(filterCandidatesByTag(candidates, ""), candidates);
  assert.deepEqual(filterCandidatesByTag(candidates, "classic").map((candidate) => candidate.id), ["1", "2"]);
});
