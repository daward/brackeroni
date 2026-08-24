import type { VoterHistoryProps } from "./scoring-types";
import { formatScoringRoundLabel } from "./scoring-formatting";

export function VoterHistoryList({ tournament, votes, scoringEnabled }: VoterHistoryProps) {
  if (!votes.length) {
    return <p className="results-empty-copy md:hidden">No scored picks are visible here yet.</p>;
  }

  return (
    <ol className="results-voter-history-list">
      {votes.map((vote) => (
        <li key={vote.matchId} className="results-voter-history-item">
          <p className="results-kicker">Round {formatScoringRoundLabel(vote, tournament)}</p>
          <p className="results-voter-history-pick display-face">{vote.selectedName}</p>
          <p className="results-voter-history-opponent">over {vote.opponentName || "bye"}</p>
          <p className="results-voter-history-result">
            {vote.correct ? "Correct" : `Lost to ${vote.winnerName}`}
            {scoringEnabled ? ` | ${vote.pointsEarned} points` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
