import type { VoteMatch, VoteTournament } from "./voting-internal-types";
import { CandidateVoteCard } from "./candidate-vote-card";
import { formatVoteHeader } from "./vote-match-state";

type RoundProgress = {
  completed: number;
  total: number;
  percent: number;
};

type VoteMatchModalProps = {
  tournament: VoteTournament;
  match: VoteMatch;
  focusedMatches: VoteMatch[];
  currentRoundProgress: RoundProgress;
  pendingVoteMatchId: string | null;
  transitionMessage: string;
  onClose: () => void;
  onVote: (matchId: string, tournamentId: string, selectedEntryId: string | null | undefined) => void;
};

export function VoteMatchModal({ tournament, match, focusedMatches, currentRoundProgress, pendingVoteMatchId, transitionMessage, onClose, onVote }: VoteMatchModalProps) {
  return (
    <div className="vote-modal-overlay">
      <div className="vote-modal-shell vote-match-modal-shell">
        <div className="vote-match-modal-header">
          <div>
            <p className="vote-kicker">{formatVoteHeader(match, tournament)}</p>
            <h2 className="vote-match-modal-title display-face">{tournament.title}</h2>
            {currentRoundProgress.total > 0 ? (
              <div className="vote-match-progress">
                <div className="vote-match-progress-bar">
                  <div className="vote-match-progress-fill" style={{ width: `${currentRoundProgress.percent}%` }} />
                </div>
                <p className="vote-match-progress-count">
                  {currentRoundProgress.completed}/{currentRoundProgress.total}
                </p>
              </div>
            ) : (
              <p className="vote-match-open-count">
                {focusedMatches.length} open {focusedMatches.length === 1 ? "match" : "matches"} remain
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="vote-modal-close display-face">
            Close
          </button>
        </div>
        {transitionMessage ? (
          <div className="vote-transition-bar">
            <p className="vote-transition-copy">{transitionMessage}</p>
          </div>
        ) : null}

        <div className="vote-matchup-grid">
          <CandidateVoteCard
            name={match.leftName}
            description={match.leftDescription}
            imageUrl={match.leftImageUrl}
            disabled={pendingVoteMatchId === match.id}
            onVote={() => onVote(match.id, tournament.id, match.leftEntryId)}
            side="left"
          />
          <div className="vote-match-vs-column">
            <div className="vote-match-vs-badge">
              <p className="vote-match-vs-text display-face">Vs</p>
            </div>
          </div>
          <CandidateVoteCard
            name={match.rightName}
            description={match.rightDescription}
            imageUrl={match.rightImageUrl}
            disabled={pendingVoteMatchId === match.id}
            onVote={() => onVote(match.id, tournament.id, match.rightEntryId)}
            side="right"
          />
        </div>
      </div>
    </div>
  );
}
