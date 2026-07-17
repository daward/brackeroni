export function CandidateTagList({ tags = [], className = "" }) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="border border-[var(--line)] bg-[var(--panel-3)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--accent-3)]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
