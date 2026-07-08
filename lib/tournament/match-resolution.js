export function resolveMatchWinner(match, tieBreakMode) {
  if (!match.leftEntryId) {
    return {
      winnerEntryId: match.rightEntryId,
      resolutionSource: "bye"
    };
  }

  if (!match.rightEntryId) {
    return {
      winnerEntryId: match.leftEntryId,
      resolutionSource: "bye"
    };
  }

  if (match.leftVoteCount > match.rightVoteCount) {
    return {
      winnerEntryId: match.leftEntryId,
      resolutionSource: "vote"
    };
  }

  if (match.rightVoteCount > match.leftVoteCount) {
    return {
      winnerEntryId: match.rightEntryId,
      resolutionSource: "vote"
    };
  }

  if (tieBreakMode === "random") {
    return {
      winnerEntryId: Math.random() < 0.5 ? match.leftEntryId : match.rightEntryId,
      resolutionSource: "tie_break"
    };
  }

  return {
    winnerEntryId: match.leftSeed <= match.rightSeed ? match.leftEntryId : match.rightEntryId,
    resolutionSource: "tie_break"
  };
}