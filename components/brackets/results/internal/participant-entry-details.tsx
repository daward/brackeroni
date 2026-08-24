import { BackdropRemoteImage } from "@/components/shared";
import { CandidateHistory } from "./candidate-history";
import type { ParticipantEntryDetailsProps } from "./parallel-results-types";

export function ParticipantEntryDetails({
  tournament,
  selectedEntry,
  participantEntry,
  selectedParticipant,
  selectedParticipantHistory,
  includeParticipantName = false,
}: ParticipantEntryDetailsProps) {
  if (!selectedEntry) {
    return <p className="results-empty-copy">No completed ballots yet.</p>;
  }

  const rank = selectedParticipant?.candidateRanks[selectedEntry.candidateId]?.finalRank ?? "n/a";
  const participantLabel = selectedParticipant?.name || selectedParticipant?.email || "Anonymous voter";

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
            Rank {rank} | Seed {selectedEntry.seed}
            {includeParticipantName ? ` | ${participantLabel}` : ""}
          </p>
        </div>
      </div>

      <CandidateHistory
        tournament={tournament}
        selectedEntry={participantEntry ?? selectedEntry}
        selectedParticipant={selectedParticipant}
        historyMatches={selectedParticipantHistory}
      />
    </>
  );
}
