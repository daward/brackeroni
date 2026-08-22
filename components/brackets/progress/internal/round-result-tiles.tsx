import { BackdropRemoteImage } from "@/components/shared";
import {
  getSwissPointsEarned,
  type MatchSummary,
} from "@/lib/brackets/progress";

type SwissEntryStats = { points: number; wins: number; losses: number; byes: number };
type SwissStats = Map<string, SwissEntryStats>;

type WinnerTileProps = { match: MatchSummary; swissStats?: SwissStats | null };

export function WinnerTile({ match, swissStats = null }: WinnerTileProps) {
  const winnerSwissStats = match.winnerEntryId ? swissStats?.get(match.winnerEntryId) ?? null : null;
  const pointsEarned = getSwissPointsEarned(match, match.winnerEntryId);

  return (
    <div className="progress-result-row">
      {match.winnerImageUrl ? (
        <BackdropRemoteImage
          src={match.winnerImageUrl}
          alt={match.winnerName ?? ""}
          className="h-[4.5rem] w-[4.5rem] border border-[var(--line)]"
          imageClassName="object-cover object-center"
          undersizedImageClassName="object-contain p-2"
          minimumSourceWidth={72}
          minimumSourceHeight={72}
        />
      ) : (
        <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center border border-[var(--line)] bg-[var(--panel-2)]">
          <span className="display-face text-xl font-black text-[var(--accent-2)]">
            {match.winnerSeed}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <p className="display-face truncate text-xl font-black leading-tight text-[var(--ink)]">
          #{match.winnerSeed} {match.winnerName} ({match.winnerVotes})
        </p>
        {winnerSwissStats ? (
          <p className="mt-2 font-serif text-sm leading-6 text-[var(--accent-3)]">
            +{pointsEarned} point / {winnerSwissStats.points} total
          </p>
        ) : null}
        <p className="mt-1 font-serif text-sm leading-6 text-[var(--muted)]">
          defeated #{match.loserSeed} {match.loserName} ({match.loserVotes})
        </p>
      </div>
    </div>
  );
}
