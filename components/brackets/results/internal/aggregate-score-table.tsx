import { ResultsTable } from "./results-table";
import type { ScoreCollectionProps } from "./scoring-types";
import { formatWinPercentage } from "./scoring-formatting";

export function AggregateScoreTable({ scores, selectedVoterKey, onSelectVoter, scoringEnabled }: ScoreCollectionProps) {
  return (
    <ResultsTable className="results-scoring-table" wrapperClassName="hidden md:block">
      <thead>
        <tr>
          <th className="results-scoring-rank-column">#</th>
          <th>Voter</th>
          {scoringEnabled ? <th>Score</th> : null}
          <th>Win %</th>
          <th>Record</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((score, index) => (
          <tr key={score.voterKey} className={selectedVoterKey === score.voterKey ? "results-scoreboard-row-active" : undefined}>
            <td className="results-scoring-rank-column">{index + 1}</td>
            <td>
              <button type="button" onClick={() => onSelectVoter(score.voterKey)} className="results-scoreboard-table-button">
                <div className="results-scoreboard-name">
                  <span>{score.name || "Anonymous voter"}</span>
                  {score.email ? <span className="results-scoreboard-subtle">{score.email}</span> : null}
                </div>
              </button>
            </td>
            {scoringEnabled ? <td>{score.score}</td> : null}
            <td>{formatWinPercentage(score.winPercentage)}</td>
            <td>
              {score.correctPicks}-{score.incorrectPicks}
            </td>
          </tr>
        ))}
      </tbody>
    </ResultsTable>
  );
}
