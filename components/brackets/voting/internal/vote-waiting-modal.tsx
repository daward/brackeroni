import type { VoteTournament } from "./voting-internal-types";

type VoteWaitingModalProps = {
  tournament: VoteTournament;
  transitionMessage: string;
  postRoundPollCount: number;
};

export function VoteWaitingModal({ tournament, transitionMessage, postRoundPollCount }: VoteWaitingModalProps) {
  return (
    <div className="vote-modal-overlay">
      <div className="vote-modal-shell vote-waiting-modal-shell">
        <div className="vote-match-modal-header">
          <div>
            <p className="vote-kicker">Round Complete</p>
            <h2 className="vote-match-modal-title display-face">{tournament.title}</h2>
            <p className="vote-match-open-count">Waiting for the next round to open</p>
          </div>
        </div>
        <div className="vote-waiting-body">
          {transitionMessage ? <p className="vote-transition-copy">{transitionMessage}</p> : null}
          <p className="vote-callout-copy">
            Your current round is done. This page will keep checking for the next matchup and update automatically when it opens.
          </p>
          <div className="vote-waiting-stats">
            <div className="vote-waiting-stat">
              <p className="vote-waiting-stat-label">Polling</p>
              <p className="vote-waiting-stat-value display-face">Every 10 seconds</p>
            </div>
            <div className="vote-waiting-stat">
              <p className="vote-waiting-stat-label">Checks Remaining</p>
              <p className="vote-waiting-stat-value display-face">{Math.max(18 - postRoundPollCount, 0)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
