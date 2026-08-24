import type { AggregateResultEntry, AggregateSortDirection, AggregateSortKey } from "./parallel-results-types";

export const AGGREGATE_SORT_OPTIONS: Record<
  AggregateSortKey,
  { key: keyof AggregateResultEntry; direction: AggregateSortDirection }
> = {
  aggregateRank: { key: "finalRank", direction: "asc" },
  show: { key: "candidateName", direction: "asc" },
  yourRank: { key: "yourRank", direction: "asc" },
  rankDifference: { key: "rankDifference", direction: "asc" },
  averageRank: { key: "averageRank", direction: "asc" },
  rankStdDev: { key: "rankStdDev", direction: "asc" },
};

export function getSortIndicator(
  sortKey: AggregateSortKey,
  sortDirection: AggregateSortDirection,
  columnKey: AggregateSortKey,
) {
  if (sortKey !== columnKey) {
    return "";
  }

  return sortDirection === "asc" ? " ^" : " v";
}

export function getAggregateSortValue(entry: AggregateResultEntry, sortKey: AggregateSortKey) {
  if (sortKey === "show") {
    return entry.candidateName.toLowerCase();
  }

  if (sortKey === "yourRank") {
    return entry.yourRank ?? Number.MAX_SAFE_INTEGER;
  }

  return entry[AGGREGATE_SORT_OPTIONS[sortKey].key] ?? Number.MAX_SAFE_INTEGER;
}
