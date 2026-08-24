import { BackdropRemoteImage } from "@/components/shared";
import { ResultsTable } from "./results-table";
import type { AggregateEntryDetailsProps, ParticipantScore } from "./parallel-results-types";
import { formatRank, formatSignedRankDiff } from "./parallel-results-formatting";

export function AggregateEntryDetails({
  selectedEntry,
  participants,
  viewerParticipant,
  hasOpenBallots,
}: AggregateEntryDetailsProps) {
  if (!selectedEntry) {
    return <p className="results-empty-copy">No aggregate results available yet.</p>;
  }

  const participantScores = [...participants]
    .reduce<ParticipantScore[]>((scores, participant) => {
      const rank = participant.candidateRanks[selectedEntry.candidateId]?.finalRank ?? null;

      if (typeof rank !== "number") {
        return scores;
      }

      scores.push({
        id: participant.id,
        name: participant.name || participant.email || "Anonymous voter",
        rank,
      });

      return scores;
    }, [])
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return left.name.localeCompare(right.name);
    });

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
            Rank {selectedEntry.finalRank} | Avg rank {formatRank(selectedEntry.averageRank)} | Spread{" "}
            {formatRank(selectedEntry.rankStdDev)}
          </p>
          {viewerParticipant ? (
            <p className="results-details-meta">
              Your rank {selectedEntry.yourRank ?? "n/a"} | Rank diff {formatSignedRankDiff(selectedEntry.rankDifference)}
            </p>
          ) : null}
        </div>
      </div>

      <section className="results-history">
        <h3 className="results-section-title">{hasOpenBallots ? "Participant Scores So Far" : "Participant Scores"}</h3>
        {participantScores.length === 0 ? (
          <p className="results-empty-copy">No completed participant ranks are available yet.</p>
        ) : (
          <ResultsTable compact>
            <thead>
              <tr>
                <th>Name</th>
                <th>Rank</th>
              </tr>
            </thead>
            <tbody>
              {participantScores.map((participant) => (
                <tr key={participant.id}>
                  <td>{participant.name}</td>
                  <td>{participant.rank}</td>
                </tr>
              ))}
            </tbody>
          </ResultsTable>
        )}
      </section>
    </>
  );
}
