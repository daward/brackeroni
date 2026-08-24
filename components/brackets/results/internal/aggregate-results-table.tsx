import { BackdropRemoteImage } from "@/components/shared";
import { ResultsTable } from "./results-table";
import { AggregateSortButton } from "./aggregate-sort-button";
import type { AggregateResultsTableProps } from "./parallel-results-types";
import { formatRank, formatSignedRankDiff } from "./parallel-results-formatting";

export function AggregateResultsTable({
  entries,
  selectedEntryId,
  onSelectEntry,
  sortKey,
  sortDirection,
  onToggleSort,
}: AggregateResultsTableProps) {
  return (
    <ResultsTable className="parallel-results-table">
      <thead>
        <tr>
          <th>
            <AggregateSortButton
              columnKey="aggregateRank"
              label="Aggregate Rank"
              sortKey={sortKey}
              sortDirection={sortDirection}
              onToggleSort={onToggleSort}
            />
          </th>
          <th>
            <AggregateSortButton
              columnKey="show"
              label="Show"
              sortKey={sortKey}
              sortDirection={sortDirection}
              onToggleSort={onToggleSort}
            />
          </th>
          <th>
            <AggregateSortButton
              columnKey="yourRank"
              label="Your Rank"
              sortKey={sortKey}
              sortDirection={sortDirection}
              onToggleSort={onToggleSort}
            />
          </th>
          <th>
            <AggregateSortButton
              columnKey="rankDifference"
              label="Rank Diff"
              sortKey={sortKey}
              sortDirection={sortDirection}
              onToggleSort={onToggleSort}
            />
          </th>
          <th>
            <AggregateSortButton
              columnKey="averageRank"
              label="Avg Rank"
              sortKey={sortKey}
              sortDirection={sortDirection}
              onToggleSort={onToggleSort}
            />
          </th>
          <th>
            <AggregateSortButton
              columnKey="rankStdDev"
              label="Spread"
              sortKey={sortKey}
              sortDirection={sortDirection}
              onToggleSort={onToggleSort}
            />
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className={selectedEntryId === entry.id ? "results-table-row-active" : ""}>
            <td>
              <span className="results-ranking-rank parallel-results-table-rank">{entry.finalRank}</span>
            </td>
            <td>
              <button type="button" onClick={() => onSelectEntry(entry.id)} className="results-table-entry parallel-results-table-entry">
                {entry.candidateImageUrl ? (
                  <BackdropRemoteImage
                    src={entry.candidateImageUrl}
                    alt={entry.candidateName}
                    className="results-ranking-image"
                    imageClassName="object-cover object-center"
                    undersizedImageClassName="object-contain p-1.5"
                    minimumSourceWidth={72}
                    minimumSourceHeight={72}
                  />
                ) : null}
                <div className="results-ranking-copy">
                  <p className="results-ranking-name">{entry.candidateName}</p>
                  <p className="results-ranking-seed">Seed {entry.seed}</p>
                </div>
              </button>
            </td>
            <td>{typeof entry.yourRank === "number" ? entry.yourRank : "n/a"}</td>
            <td>{formatSignedRankDiff(entry.rankDifference)}</td>
            <td>{formatRank(entry.averageRank)}</td>
            <td>{formatRank(entry.rankStdDev)}</td>
          </tr>
        ))}
      </tbody>
    </ResultsTable>
  );
}
