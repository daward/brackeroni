import { BackdropRemoteImage } from "@/components/shared";
import { getSwissPointsEarned, type MatchSummary } from "./progress-policy";

type SwissEntryStats = { points: number; wins: number; losses: number; byes: number };
type SwissStats = Map<string, SwissEntryStats>;

type WinnerTileProps = { match: MatchSummary; swissStats?: SwissStats | null };

export function WinnerTile({ match, swissStats = null }: WinnerTileProps) {
  const winnerSwissStats = getWinnerSwissStats(match.winnerEntryId, swissStats);
  const pointsEarned = getSwissPointsEarned(match, match.winnerEntryId);

  return (
    <div className="progress-result-row">
      {match.winner?.imageUrl ? (
        <BackdropRemoteImage
          src={match.winner.imageUrl}
          alt={match.winner.name}
          className="progress-result-image"
          imageClassName="object-cover object-center"
          undersizedImageClassName="object-contain p-2"
          minimumSourceWidth={72}
          minimumSourceHeight={72}
        />
      ) : (
        <div className="progress-result-image-fallback">
          <span className="progress-result-image-label">{match.winner?.seed}</span>
        </div>
      )}
      <div className="progress-result-copy">
        <p className="progress-result-title">
          #{match.winner?.seed} {match.winner?.name} ({match.winnerVotes})
        </p>
        {winnerSwissStats ? (
          <p className="progress-result-accent">
            +{pointsEarned} point / {winnerSwissStats.points} total
          </p>
        ) : null}
        <p className="progress-result-meta">
          defeated #{match.loser?.seed} {match.loser?.name} ({match.loserVotes})
        </p>
      </div>
    </div>
  );
}

function getWinnerSwissStats(winnerEntryId: string | null | undefined, swissStats: SwissStats | null) {
  if (!winnerEntryId) return null;
  return swissStats?.get(winnerEntryId) ?? null;
}
