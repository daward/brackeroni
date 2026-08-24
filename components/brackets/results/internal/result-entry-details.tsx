import { BackdropRemoteImage } from "@/components/shared";
import { ResultsHistory } from "./results-history";
import type { ResultEntryDetailsProps } from "./tournament-result-types";
import { formatRecord, getDisplayRank } from "./tournament-result-ordering";
import {
  describeHistoryOpponent,
  describeHistoryResult,
  describeUserVote,
  formatRoundLabel,
  formatVoteTally,
  getOpponentImageUrl,
} from "./tournament-result-history";
import { formatSeedLabel } from "./tournament-seed-display";

export function ResultEntryDetails({
  tournament,
  orderedEntries,
  selectedEntry,
  selectedEntryHistory,
  seedDisplayByEntryId,
}: ResultEntryDetailsProps) {
  if (!selectedEntry) {
    return <p className="results-empty-copy">No result details available.</p>;
  }

  return (
    <>
      <div className="results-details-header">
        {selectedEntry.candidateImageUrl ? (
          <BackdropRemoteImage
            src={selectedEntry.candidateImageUrl}
            alt={selectedEntry.candidateName}
            className="results-details-image"
            imageClassName="object-cover object-center"
            undersizedImageClassName="object-contain p-2"
            minimumSourceWidth={96}
            minimumSourceHeight={96}
          />
        ) : null}
        <div>
          <p className="results-kicker">Candidate Details</p>
          <h2 className="results-details-title">{selectedEntry.candidateName}</h2>
          <p className="results-details-meta">
            Rank {getDisplayRank(selectedEntry, orderedEntries)} |{" "}
            {formatSeedLabel(seedDisplayByEntryId, selectedEntry.id, selectedEntry.seed)} |{" "}
            {formatRecord(selectedEntryHistory, selectedEntry.id)}
          </p>
        </div>
      </div>

      <ResultsHistory title="Match History" hasItems={selectedEntryHistory.length > 0} emptyMessage="No played matches to show yet.">
        {selectedEntryHistory.map((match) => {
          const voteNote = describeUserVote(match);
          const opponentLabel = describeHistoryOpponent(match, selectedEntry.id, seedDisplayByEntryId);
          const opponentImageUrl = getOpponentImageUrl(match, selectedEntry.id);

          return (
            <article key={match.id} className="results-history-card">
              <p className="results-history-round">{formatRoundLabel(match, tournament)}</p>
              <div className="results-history-card-body">
                <div>
                  <p className="results-history-result">{describeHistoryResult(match, selectedEntry.id)}</p>
                  {voteNote ? <p className={`results-history-vote-note ${voteNote.className}`}>{voteNote.label}</p> : null}
                  <p className="results-history-tally">Vote: {formatVoteTally(match, selectedEntry.id)}</p>
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
        })}
      </ResultsHistory>
    </>
  );
}
