import assert from "node:assert/strict";
import { test } from "vitest";

import { getAutomaticImageSuggestionQuery } from "../../../components/pools/shared";

test("existing candidates automatically request image suggestions by name", () => {
  assert.equal(
    getAutomaticImageSuggestionQuery({
      candidateId: "candidate-1",
      candidateName: "Care Bears",
      completedQuery: "",
      isLoading: false
    }),
    "Care Bears"
  );
});

test("automatic image suggestions wait for an existing candidate with a usable new name", () => {
  const base = { candidateId: "candidate-1", candidateName: "Care Bears", completedQuery: "", isLoading: false };

  assert.equal(getAutomaticImageSuggestionQuery({ ...base, candidateId: null }), null);
  assert.equal(getAutomaticImageSuggestionQuery({ ...base, candidateName: "C" }), null);
  assert.equal(getAutomaticImageSuggestionQuery({ ...base, completedQuery: "Care Bears" }), null);
  assert.equal(getAutomaticImageSuggestionQuery({ ...base, isLoading: true }), null);
});
