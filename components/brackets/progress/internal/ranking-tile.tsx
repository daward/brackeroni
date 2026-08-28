import { BackdropRemoteImage } from "@/components/shared";
import type { ProgressEntry } from "./progress-policy";

type SwissEntryStats = { points: number; wins: number; losses: number; byes: number };
type SwissStats = Map<string, SwissEntryStats>;
type RankingTileProps = { entry: ProgressEntry; fallbackRank: number; swissStats?: SwissStats | null };

export function RankingTile({ entry, fallbackRank, swissStats = null }: RankingTileProps) {
  const rank = entry.finalRank ?? fallbackRank;
  const entrySwissStats = swissStats?.get(entry.id) || null;

  return (
    <div className="progress-result-row">
      {entry.candidateImageUrl ? (
        <BackdropRemoteImage
          src={entry.candidateImageUrl}
          alt={entry.candidateName}
          className="progress-result-image"
          imageClassName="object-cover object-center"
          undersizedImageClassName="object-contain p-2"
          minimumSourceWidth={72}
          minimumSourceHeight={72}
        />
      ) : (
        <div className="progress-result-image-fallback">
          <span className="progress-result-image-label">#{rank}</span>
        </div>
      )}
      <div className="progress-result-copy">
        <p className="progress-result-title">
          #{rank} {entry.candidateName}
        </p>
        {entrySwissStats ? (
          <p className="progress-result-accent">
            {entrySwissStats.points} pts / {entrySwissStats.wins}-{entrySwissStats.losses}
            {entrySwissStats.byes ? ` / ${entrySwissStats.byes} bye` : ""}
          </p>
        ) : null}
        <p className="progress-result-meta">Original seed #{entry.seed}</p>
      </div>
    </div>
  );
}
