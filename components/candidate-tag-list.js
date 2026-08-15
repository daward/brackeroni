export function CandidateTagList({ tags = [], className = "", limit = null }) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  const visibleTags = Number.isInteger(limit) ? tags.slice(0, limit) : tags;
  const remainingCount = Math.max(tags.length - visibleTags.length, 0);

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {visibleTags.map((tag) => (
        <span
          key={tag}
          className="border border-[var(--line)] bg-[var(--panel-3)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--accent-3)]"
        >
          {tag}
        </span>
      ))}
      {remainingCount ? (
        <span className="border border-[var(--line)] bg-[var(--panel-3)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          +{remainingCount}
        </span>
      ) : null}
    </div>
  );
}
