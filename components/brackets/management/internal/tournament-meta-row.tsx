import type { TournamentMetaRowProps } from "../types";

export function TournamentMetaRow({
  items,
  separator = "dot",
  className = "tournament-meta-row",
}: TournamentMetaRowProps) {
  const visibleItems = items.filter(Boolean);

  if (visibleItems.length === 0) {
    return null;
  }

  const separatorLabel = separator === "slash" ? "/" : "\u2022";

  return (
    <div className={className}>
      {visibleItems.map((item, index) => (
        <span key={`${item}-${index}`} className="tournament-meta-row-item">
          {index > 0 ? <span>{separatorLabel}</span> : null}
          <span>{item}</span>
        </span>
      ))}
    </div>
  );
}
