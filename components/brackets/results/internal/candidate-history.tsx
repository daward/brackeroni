import { BackdropRemoteImage } from "@/components/shared";
import { ResultsHistory } from "./results-history";
import type { CandidateHistoryProps } from "./parallel-results-types";
import { formatRoundLabel } from "./parallel-results-formatting";
import {
  describeHistoryOpponent,
  describeHistoryResult,
  formatVoteTally,
  getOpponentImageUrl,
} from "./parallel-results-history";

export function CandidateHistory({
  tournament,
  selectedEntry,
  selectedParticipant,
  historyMatches,
}: CandidateHistoryProps) {
  if (!selectedParticipant) {
    return <ResultsHistory title="Ballot History" hasItems={false} emptyMessage="No participant ballot details are visible here." />;
  }

  const selectedParticipantEntryId = selectedEntry.participantEntryId ?? selectedEntry.id;

  return (
    <ResultsHistory title="Ballot History">
      <div className="results-history-card">
        <p className="results-history-round">Selected Voter</p>
        <div className="results-history-card-body">
          <div>
            <p className="results-history-result">{selectedParticipant.name || selectedParticipant.email || "Anonymous voter"}</p>
            <p className="results-history-opponent">
              Final rank for this candidate: #{selectedParticipant.candidateRanks[selectedEntry.candidateId]?.finalRank ?? "n/a"}
            </p>
          </div>
        </div>
      </div>
      {historyMatches.length === 0 ? (
        <p className="results-empty-copy">No played matches to show for this candidate.</p>
      ) : (
        historyMatches.map((match) => {
          const opponentLabel = describeHistoryOpponent(match, selectedParticipantEntryId);
          const opponentImageUrl = getOpponentImageUrl(match, selectedParticipantEntryId);

          return (
            <article key={match.id} className="results-history-card">
              <p className="results-history-round">{formatRoundLabel(match, tournament)}</p>
              <div className="results-history-card-body">
                <div>
                  <p className="results-history-result">{describeHistoryResult(match, selectedParticipantEntryId)}</p>
                  <p className="results-history-tally">Vote: {formatVoteTally(match, selectedParticipantEntryId)}</p>
                  <p className="results-history-opponent">{opponentLabel}</p>
                </div>
                {opponentImageUrl ? (
                  <BackdropRemoteImage
                    src={opponentImageUrl}
                    alt={opponentLabel}
                    className="results-history-image"
                    imageClassName="object-cover object-center"
                    undersizedImageClassName="object-contain p-2"
                    minimumSourceWidth={100}
                    minimumSourceHeight={100}
                  />
                ) : null}
              </div>
            </article>
          );
        })
      )}
    </ResultsHistory>
  );
}
