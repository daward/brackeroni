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

function getMatchSide(match: VoteMatch, side: "left" | "right") {
  const candidate = match[side];
  const prefix = side === "left" ? "left" : "right";

  return {
    id: candidate?.id ?? (prefix === "left" ? match.leftEntryId : match.rightEntryId),
    name: candidate?.name ?? (prefix === "left" ? match.leftName : match.rightName),
    description: prefix === "left" ? match.leftDescription : match.rightDescription,
    imageUrl: candidate?.imageUrl ?? (prefix === "left" ? match.leftImageUrl : match.rightImageUrl),
  };
}

export function VoteMatchModal({ tournament, match, focusedMatches, currentRoundProgress, pendingVoteMatchId, transitionMessage, onClose, onVote }: VoteMatchModalProps) {
  const left = getMatchSide(match, "left");
  const right = getMatchSide(match, "right");

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
            name={left.name}
            description={left.description}
            imageUrl={left.imageUrl}
            disabled={pendingVoteMatchId === match.id}
            onVote={() => onVote(match.id, tournament.id, left.id)}
            side="left"
          />
          <div className="vote-match-vs-column">
            <div className="vote-match-vs-badge">
              <p className="vote-match-vs-text display-face">Vs</p>
            </div>
          </div>
          <CandidateVoteCard
            name={right.name}
            description={right.description}
            imageUrl={right.imageUrl}
            disabled={pendingVoteMatchId === match.id}
            onVote={() => onVote(match.id, tournament.id, right.id)}
            side="right"
          />
        </div>
      </div>
    </div>
  );
}
