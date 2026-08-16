import { BackdropRemoteImage } from "@/components/shared/resilient-remote-image";

export function ResultsRankingList({ entries, selectedEntryId, onSelectEntry, getRank, getSeedLabel }) {
  return (
    <div className="results-ranking-list">
      {entries.map((entry, index) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onSelectEntry(entry.id)}
          className={`results-ranking-item ${selectedEntryId === entry.id ? "results-ranking-item-active" : "results-ranking-item-idle"}`}
        >
          <span className="results-ranking-rank">{getRank(entry, index)}</span>
          {entry.candidateImageUrl ? (
            <BackdropRemoteImage src={entry.candidateImageUrl} alt={entry.candidateName} className="results-ranking-image" imageClassName="object-cover object-center" undersizedImageClassName="object-contain p-1.5" minimumSourceWidth={72} minimumSourceHeight={72} />
          ) : null}
          <div className="results-ranking-copy">
            <p className="results-ranking-name">{entry.candidateName}</p>
            <p className="results-ranking-seed">{getSeedLabel(entry, index)}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
