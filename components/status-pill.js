export function StatusPill({ children }) {
  return (
    <span className="border border-[var(--accent)] bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-2)]">
      {children}
    </span>
  );
}
