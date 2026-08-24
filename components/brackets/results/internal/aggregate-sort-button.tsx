import type { AggregateSortDirection, AggregateSortKey } from "./parallel-results-types";
import { getSortIndicator } from "./parallel-results-sorting";

type AggregateSortButtonProps = {
  columnKey: AggregateSortKey;
  label: string;
  sortKey: AggregateSortKey;
  sortDirection: AggregateSortDirection;
  onToggleSort: (nextKey: AggregateSortKey) => void;
};

export function AggregateSortButton({
  columnKey,
  label,
  sortKey,
  sortDirection,
  onToggleSort,
}: AggregateSortButtonProps) {
  return (
    <button type="button" className="results-table-sort" onClick={() => onToggleSort(columnKey)}>
      {label}
      {getSortIndicator(sortKey, sortDirection, columnKey)}
    </button>
  );
}
