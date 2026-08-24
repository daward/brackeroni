import type { ScoreCollectionProps } from "./scoring-types";
import { formatWinPercentage } from "./scoring-formatting";

export function AggregateScoreList({ scores, selectedVoterKey, onSelectVoter, scoringEnabled }: ScoreCollectionProps) {
  return (
    <ol className="results-score-list">
      {scores.map((score, index) => {
        const buttonClassName =
          selectedVoterKey === score.voterKey
            ? "results-score-list-button results-score-list-button-active"
            : "results-score-list-button";

        return (
          <li key={score.voterKey}>
            <button type="button" onClick={() => onSelectVoter(score.voterKey)} className={buttonClassName}>
              <span className="results-score-list-rank display-face">{index + 1}</span>
              <span className="results-score-list-voter">
                <span className="results-score-list-name display-face">{score.name || "Anonymous voter"}</span>
                {score.email ? <span className="results-score-list-email">{score.email}</span> : null}
              </span>
              <span className="results-score-list-stats">
                {scoringEnabled ? <span className="results-score-list-score display-face">{score.score}</span> : null}
                <span className="results-score-list-record">
                  {formatWinPercentage(score.winPercentage)} | {score.correctPicks}-{score.incorrectPicks}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
