import { describe, expect, it } from "vitest";
import { buildResultsUrl } from "../../../components/brackets/voting/internal/vote-routing";

describe("vote results routing", () => {
  it("keeps synchronized voters on their own completed ballot results", () => {
    expect(buildResultsUrl({
      id: "parent-bracket",
      viewerTournamentId: "participant-bracket",
      parentParallelTournamentId: null,
    } as any)).toBe("/results/participant-bracket");
  });

  it("uses the current bracket id when there is no viewer ballot", () => {
    expect(buildResultsUrl({
      id: "standard-bracket",
      parentParallelTournamentId: "parent-bracket",
    } as any)).toBe("/results/standard-bracket");
  });
});
