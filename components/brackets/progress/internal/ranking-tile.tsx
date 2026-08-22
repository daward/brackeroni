import { BackdropRemoteImage } from "@/components/shared";
import type { ProgressEntry } from "@/lib/brackets/progress";

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
          className="h-[4.5rem] w-[4.5rem] border border-[var(--line)]"
          imageClassName="object-cover object-center"
          undersizedImageClassName="object-contain p-2"
          minimumSourceWidth={72}
          minimumSourceHeight={72}
        />
      ) : (
        <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center border border-[var(--line)] bg-[var(--panel-2)]">
          <span className="display-face text-xl font-black text-[var(--accent-2)]">#{rank}</span>
        </div>
      )}
      <div className="min-w-0">
        <p className="display-face truncate text-xl font-black leading-tight text-[var(--ink)]">
          #{rank} {entry.candidateName}
        </p>
        {entrySwissStats ? (
          <p className="mt-2 font-serif text-sm leading-6 text-[var(--accent-3)]">
            {entrySwissStats.points} pts / {entrySwissStats.wins}-{entrySwissStats.losses}
            {entrySwissStats.byes ? ` / ${entrySwissStats.byes} bye` : ""}
          </p>
        ) : null}
        <p className="mt-1 font-serif text-sm leading-6 text-[var(--muted)]">
          Original seed #{entry.seed}
        </p>
      </div>
    </div>
  );
}
