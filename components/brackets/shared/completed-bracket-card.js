import { ImageRailCard } from "@/components/shared/image-rail-card";

export function CompletedBracketCard({
  tournament,
  as = "button",
  href,
  onClick,
  type,
  winnerLabel,
  railClassName = "",
  className = ""
}) {
  const resolvedWinnerLabel =
    winnerLabel ??
    (tournament.winnerName
      ? `${tournament.winnerName}${tournament.winnerSeed ? ` (Seed ${tournament.winnerSeed})` : ""}`
      : null);

  return (
    <ImageRailCard
      as={as}
      imageUrl={tournament.winnerImageUrl}
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
