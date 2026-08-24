import type { ParallelResultsPageProps } from "../types";
import type { AggregateResultEntry, ParticipantEntry } from "./parallel-results-types";

export function getParticipantEntry(
  selectedEntry: AggregateResultEntry | null,
  selectedParticipant: ParallelResultsPageProps["participants"][number] | null,
): ParticipantEntry | null {
  if (!selectedEntry || !selectedParticipant) {
    return null;
  }

  const candidateRank = selectedParticipant.candidateRanks[selectedEntry.candidateId];
  const participantEntryId = candidateRank?.entryId;

  return participantEntryId
    ? {
        ...selectedEntry,
        participantEntryId,
      }
    : null;
}
