export function StatusPill({ children }) {
  const status = String(children || "").toLowerCase();
  const toneClass =
    status === "active"
      ? "bg-[var(--accent-3)]"
      : status === "complete"
        ? "bg-[var(--accent-2)]"
        : "bg-[var(--muted)]";

  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
      <span className={`h-2 w-2 rounded-full ${toneClass}`} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
