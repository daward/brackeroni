import type { VoterSummaryBarProps } from "./scoring-types";
import { formatWinPercentage } from "./scoring-formatting";

export function VoterSummaryBar({ score, scoringEnabled }: VoterSummaryBarProps) {
  if (!score) {
    return <p className="results-empty-copy">No voter details available.</p>;
  }

  return (
    <div className="results-voter-summary">
      <p className="results-kicker">Voter Summary</p>
      <div className="results-voter-summary-row">
        <span className="results-voter-summary-name display-face">{score.name || "Anonymous voter"}</span>
        {scoringEnabled ? <span className="results-scoreboard-stat">Score {score.score}</span> : null}
        <span className="results-scoreboard-stat">{formatWinPercentage(score.winPercentage)}</span>
        <span className="results-scoreboard-stat">
          {score.correctPicks}-{score.incorrectPicks}
        </span>
      </div>
      {score.email ? <p className="results-details-meta results-voter-summary-email">{score.email}</p> : null}
      <p className="results-scoreboard-note results-voter-summary-note">
        {score.correctPicks} correct out of {score.totalPicks} scored picks.
      </p>
    </div>
  );
}
