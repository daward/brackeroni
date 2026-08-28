import type { BracketResultMode } from "@/lib/brackets/types";

type ResultModeMeta = {
  label: string;
  parallel: boolean;
  swiss: boolean;
  openEndedRanking: boolean;
  partialRanking: boolean;
  usesBracketStyle: boolean;
};

export const STANDARD_RESULT_MODES = [
  "winner_only",
  "full_ranking",
  "partial_ranking",
  "fast_full_rank"
] as const satisfies readonly BracketResultMode[];

export const PARALLEL_RESULT_MODES = [
  "parallel_full_ranking",
  "parallel_partial_ranking"
] as const satisfies readonly BracketResultMode[];

export const ALL_RESULT_MODES = [
  ...STANDARD_RESULT_MODES,
  ...PARALLEL_RESULT_MODES
] as const satisfies readonly BracketResultMode[];

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
} satisfies Record<BracketResultMode, ResultModeMeta>;

function parseResultMode(resultMode: string | null | undefined): BracketResultMode | null {
  return resultMode && resultMode in RESULT_MODE_META ? resultMode as BracketResultMode : null;
}

export function getResultModeMeta(resultMode: string | null | undefined): ResultModeMeta | null {
  const parsed = parseResultMode(resultMode);
  return parsed ? RESULT_MODE_META[parsed] : null;
}

export function formatResultModeLabel(resultMode: string | null | undefined): string {
  return (
    getResultModeMeta(resultMode)?.label ||
    String(resultMode || "unknown").replaceAll("_", " ")
  );
}

export function isParallelResultMode(resultMode: string | null | undefined): boolean {
  return Boolean(getResultModeMeta(resultMode)?.parallel);
}

export function usesSwissResultMode(resultMode: string | null | undefined): boolean {
  return Boolean(getResultModeMeta(resultMode)?.swiss);
}

export function usesOpenEndedRankingMode(resultMode: string | null | undefined): boolean {
  return Boolean(getResultModeMeta(resultMode)?.openEndedRanking);
}

export function isPartialRankingMode(resultMode: string | null | undefined): boolean {
  return Boolean(getResultModeMeta(resultMode)?.partialRanking);
}

export function usesBracketStyleForResultMode(resultMode: string | null | undefined): boolean {
  return Boolean(getResultModeMeta(resultMode)?.usesBracketStyle);
}

export function getParticipantChildResultMode(parallelResultMode: string | null | undefined): BracketResultMode {
  return isPartialRankingMode(parallelResultMode) ? "partial_ranking" : "full_ranking";
}
