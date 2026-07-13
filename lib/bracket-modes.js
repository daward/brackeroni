export const STANDARD_RESULT_MODES = [
  "winner_only",
  "full_ranking",
  "partial_ranking",
  "fast_full_rank"
];

export const PARALLEL_RESULT_MODES = [
  "parallel_full_ranking",
  "parallel_partial_ranking"
];

export const ALL_RESULT_MODES = [...STANDARD_RESULT_MODES, ...PARALLEL_RESULT_MODES];

const RESULT_MODE_META = {
  winner_only: {
    label: "Winner Only",
    parallel: false,
    swiss: false,
    openEndedRanking: false,
    partialRanking: false,
    usesBracketStyle: true
  },
  full_ranking: {
    label: "Full Ranking",
    parallel: false,
    swiss: false,
    openEndedRanking: true,
    partialRanking: false,
    usesBracketStyle: true
  },
  partial_ranking: {
    label: "Partially Ranked",
    parallel: false,
    swiss: false,
    openEndedRanking: true,
    partialRanking: true,
    usesBracketStyle: true
  },
  fast_full_rank: {
    label: "Fast Full Rank",
    parallel: false,
    swiss: true,
    openEndedRanking: false,
    partialRanking: false,
    usesBracketStyle: true
  },
  parallel_full_ranking: {
    label: "Parallel Full Ranking",
    parallel: true,
    swiss: false,
    openEndedRanking: true,
    partialRanking: false,
    usesBracketStyle: false
  },
  parallel_partial_ranking: {
    label: "Parallel Partially Ranked",
    parallel: true,
    swiss: false,
    openEndedRanking: true,
    partialRanking: true,
    usesBracketStyle: false
  }
};

export function getResultModeMeta(resultMode) {
  return RESULT_MODE_META[resultMode] || null;
}

export function formatResultModeLabel(resultMode) {
  return (
    getResultModeMeta(resultMode)?.label ||
    String(resultMode || "unknown").replaceAll("_", " ")
  );
}

export function isParallelResultMode(resultMode) {
  return Boolean(getResultModeMeta(resultMode)?.parallel);
}

export function usesSwissResultMode(resultMode) {
  return Boolean(getResultModeMeta(resultMode)?.swiss);
}

export function usesOpenEndedRankingMode(resultMode) {
  return Boolean(getResultModeMeta(resultMode)?.openEndedRanking);
}

export function isPartialRankingMode(resultMode) {
  return Boolean(getResultModeMeta(resultMode)?.partialRanking);
}

export function usesBracketStyleForResultMode(resultMode) {
  return Boolean(getResultModeMeta(resultMode)?.usesBracketStyle);
}

export function getParticipantChildResultMode(parallelResultMode) {
  return isPartialRankingMode(parallelResultMode) ? "partial_ranking" : "full_ranking";
}
