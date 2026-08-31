import { ImageRailCard } from "@/components/shared";
import type { CompletedBracketCardProps } from "../types";

function formatWinnerLabel(tournament: CompletedBracketCardProps["tournament"]) {
  if (!tournament.winner) return null;
  return `${tournament.winner.name} (Seed ${tournament.winner.seed})`;
}

export function CompletedBracketCard({ tournament, as = "button", href, onClick, type, winnerLabel, railClassName = "", className = "" }: CompletedBracketCardProps) {
  const resolvedWinnerLabel = winnerLabel ?? formatWinnerLabel(tournament);

  return (
    <ImageRailCard
      as={as}
      imageUrl={tournament.winner?.imageUrl}
      href={href}
      onClick={onClick}
      type={type}
      className={`completed-bracket-card group ${className}`.trim()}
      railClassName={`completed-bracket-card-rail ${railClassName}`.trim()}
    >
      <h3 className="completed-bracket-card-title display-face">{tournament.title}</h3>
      {resolvedWinnerLabel ? (
        <p className="completed-bracket-card-winner display-face">
          <span>{resolvedWinnerLabel}</span>
        </p>
      ) : null}
    </ImageRailCard>
  );
}
