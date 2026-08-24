import { ResultsTable } from "./results-table";
import type { VoterHistoryProps } from "./scoring-types";
import { formatScoringRoundLabel } from "./scoring-formatting";

export function VoterHistoryTable({ tournament, votes, scoringEnabled }: VoterHistoryProps) {
  if (!votes.length) {
    return <p className="results-empty-copy">No scored picks are visible here yet.</p>;
  }

  return (
    <ResultsTable className="results-scoring-table" wrapperClassName="hidden md:block">
      <thead>
        <tr>
          <th className="results-scoring-round-column">#</th>
          <th>Pick</th>
          <th>Result</th>
          {scoringEnabled ? <th>Points</th> : null}
        </tr>
      </thead>
      <tbody>
        {votes.map((vote) => (
          <tr key={vote.matchId}>
            <td className="results-scoring-round-column">{formatScoringRoundLabel(vote, tournament)}</td>
            <td>
              <div className="results-scoring-pick">
                <span>{vote.selectedName}</span>
                <span className="results-scoreboard-subtle">over {vote.opponentName || "bye"}</span>
              </div>
            </td>
            <td>{vote.correct ? "Correct" : `Lost to ${vote.winnerName}`}</td>
            {scoringEnabled ? <td>{vote.pointsEarned}</td> : null}
          </tr>
        ))}
      </tbody>
    </ResultsTable>
  );
}
