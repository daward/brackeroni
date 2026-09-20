import { describe, expect, it } from "vitest";
import {
  buildCompletedVotingReturnUrl,
  buildResultsUrl,
} from "../../../components/brackets/voting/internal/vote-routing";

describe("vote results routing", () => {
  it("returns completed management voting to active bracket management", () => {
    expect(buildCompletedVotingReturnUrl({
      returnTo: "create",
      tournamentId: "standard-bracket",
    })).toBe("/brackets?stage=active&tournament=standard-bracket");
  });

  it("returns completed non-management voting to the voting page", () => {
    expect(buildCompletedVotingReturnUrl({
      returnTo: null,
      tournamentId: "standard-bracket",
    })).toBe("/vote");
  });

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
