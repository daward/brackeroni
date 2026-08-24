import { buildInitialRound, buildNextRound, calculateSwissRoundCount } from "./rounds.js";
import { getParticipantChildResultMode, isPartialRankingMode, isParallelResultMode, usesOpenEndedRankingMode, usesSwissResultMode } from "../bracket-modes.js";

export function estimateTournamentEffort({ candidateCount = 0, resultMode = "winner_only", playStyle = "fixed_bracket", advancementMode = "vote_winner" } = {}) {
  const normalizedCandidateCount = Math.max(0, Number(candidateCount || 0));

  if (normalizedCandidateCount < 2) {
    return {
      candidateCount: normalizedCandidateCount,
      estimatedVotesPerParticipant: 0,
      estimatedSynchronizedRounds: 0,
      synchronized: !isParallelResultMode(resultMode),
      confidence: "high",
      note: "Add at least two contenders to estimate voting effort.",
    };
  }

  if (isParallelResultMode(resultMode)) {
    const participantEstimate = estimateTournamentEffort({
      candidateCount: normalizedCandidateCount,
      resultMode: getParticipantChildResultMode(resultMode),
      playStyle,
      advancementMode,
    });

    return {
      ...participantEstimate,
      resultMode,
      synchronized: false,
      estimatedSynchronizedRounds: 0,
      confidence: "medium",
      note: "Each participant completes their own bracket; group rounds do not wait on synchronized reveals.",
    };
  }

  if (usesSwissResultMode(resultMode)) {
    const rounds = calculateSwissRoundCount(normalizedCandidateCount);

    return {
      candidateCount: normalizedCandidateCount,
      resultMode,
      estimatedVotesPerParticipant: advancementMode === "manual_winner" ? 0 : rounds * Math.floor(normalizedCandidateCount / 2),
      estimatedSynchronizedRounds: rounds,
      synchronized: true,
      confidence: "high",
      note:
        advancementMode === "manual_winner"
          ? "Manual advancement means participants do not need to vote on matchups."
          : "Swiss rounds keep contenders active, so each round has about half the field voting.",
    };
  }

  const simulated = simulateSeededRankingEffort({
    candidateCount: normalizedCandidateCount,
    resultMode,
    playStyle,
  });

  return {
    candidateCount: normalizedCandidateCount,
    resultMode,
    estimatedVotesPerParticipant: advancementMode === "manual_winner" ? 0 : simulated.openMatchCount,
    estimatedSynchronizedRounds: simulated.openRoundCount,
    synchronized: true,
    confidence: usesOpenEndedRankingMode(resultMode) ? "medium" : "high",
    note:
      advancementMode === "manual_winner"
        ? "Manual advancement means participants do not need to vote on matchups."
        : usesOpenEndedRankingMode(resultMode)
          ? "Estimated from a higher-seed-wins path; real voting can add or remove ranking rounds."
          : "Byes do not require votes, so the estimate counts only contested matchups.",
  };
}

function simulateSeededRankingEffort({ candidateCount, resultMode, playStyle }) {
  const entries = Array.from({ length: candidateCount }, (_, index) => ({
    id: `entry-${index + 1}`,
    seed: index + 1,
  }));
  const rankedEntryIds = [];
  const rankedEntryIdSet = new Set();
  const priorWinnerByPair = new Map();
  let openMatchCount = 0;
  let openRoundCount = 0;
  let sequenceNumber = 1;
  let rankingTargetRank = 1;
  let eligibleEntries = entries;
  const targetRankCount = isPartialRankingMode(resultMode) ? Math.ceil(candidateCount / 2) : candidateCount;

  while (rankedEntryIds.length < targetRankCount) {
    if (eligibleEntries.length === 0) {
      const fallbackEntry = entries.find((entry) => !rankedEntryIdSet.has(entry.id));
      if (!fallbackEntry) break;
      rankEntry(fallbackEntry);
      continue;
    }

    if (eligibleEntries.length === 1) {
      rankEntry(eligibleEntries[0]);
      eligibleEntries = getNextRankingEntries({ entries, rankedEntryIdSet, priorWinnerByPair });
      continue;
    }

    const matches =
      rankingTargetRank === 1 && sequenceNumber === 1 ? buildInitialRound(eligibleEntries) : buildNextRound(eligibleEntries, { playStyle, roundNumber: sequenceNumber });
    const resolvedMatches = resolveKnownOrSeededWinners(matches, priorWinnerByPair);
    const openMatches = resolvedMatches.filter((match) => match.countsAsVote);

    if (openMatches.length > 0) {
      openRoundCount += 1;
      openMatchCount += openMatches.length;
    }

    const advancingEntries = resolvedMatches.map((match) => entries.find((entry) => entry.id === match.winnerEntryId)).filter(Boolean);

    if (advancingEntries.length === 1) {
      rankEntry(advancingEntries[0]);

      if (!usesOpenEndedRankingMode(resultMode)) {
        break;
      }

      eligibleEntries = getNextRankingEntries({ entries, rankedEntryIdSet, priorWinnerByPair });
    } else {
      eligibleEntries = advancingEntries;
    }

    sequenceNumber += 1;
  }

  return {
    openMatchCount,
    openRoundCount,
  };

  function rankEntry(entry) {
    if (rankedEntryIdSet.has(entry.id)) return;
    rankedEntryIdSet.add(entry.id);
    rankedEntryIds.push(entry.id);
    rankingTargetRank = rankedEntryIds.length + 1;
  }
}

function resolveKnownOrSeededWinners(matches, priorWinnerByPair) {
  return matches.map((match) => {
    if (!match.leftEntryId || !match.rightEntryId) {
      return {
        ...match,
        countsAsVote: false,
        winnerEntryId: match.winnerEntryId || match.leftEntryId || match.rightEntryId,
      };
    }

    const pairKey = getPairKey(match.leftEntryId, match.rightEntryId);
    const priorWinnerId = priorWinnerByPair.get(pairKey);

    if (priorWinnerId) {
      return {
        ...match,
        countsAsVote: false,
        winnerEntryId: priorWinnerId,
      };
    }

    const winnerEntryId = Number(match.leftSeed) <= Number(match.rightSeed) ? match.leftEntryId : match.rightEntryId;
    priorWinnerByPair.set(pairKey, winnerEntryId);

    return {
      ...match,
      countsAsVote: true,
      winnerEntryId,
    };
  });
}

function getNextRankingEntries({ entries, rankedEntryIdSet, priorWinnerByPair }) {
  const candidateIds = new Set();

  for (const [pairKey, winnerEntryId] of priorWinnerByPair.entries()) {
    if (!rankedEntryIdSet.has(winnerEntryId)) continue;
    for (const entryId of pairKey.split(":")) {
      if (entryId !== winnerEntryId && !rankedEntryIdSet.has(entryId)) {
        candidateIds.add(entryId);
      }
    }
  }

  return entries.filter((entry) => candidateIds.has(entry.id));
}

function getPairKey(leftEntryId, rightEntryId) {
  return [leftEntryId, rightEntryId].sort().join(":");
}
