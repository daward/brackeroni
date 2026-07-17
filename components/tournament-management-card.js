"use client";

export function TournamentManagementCard({
  tournament,
  cardRef,
  isMuted,
  title,
  statusLabel,
  audienceLabel,
  completedLabel,
  children
}) {
  const isComplete = tournament.status === "complete";

  return (
    <div
      ref={cardRef}
      className={`${
        isComplete
          ? "completed-bracket-row bg-transparent px-5 py-5"
          : "border-b border-[var(--line)] bg-[var(--panel-2)] p-5"
      } transition-opacity duration-150 last:border-b-0 ${
        isMuted ? "opacity-45" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>{title}</div>
        <div className="text-right">
          {tournament.status !== "complete" ? (
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
              <span
                className={`h-2 w-2 rounded-full ${
                  statusLabel === "Saved"
                    ? "bg-[var(--accent-3)]"
                    : tournament.status === "active"
                      ? "bg-[var(--accent-3)]"
                      : "bg-[var(--muted)]"
                }`}
                aria-hidden="true"
              />
              <span>{statusLabel}</span>
            </span>
          ) : null}
          <p className={`${tournament.status === "complete" ? "mt-0" : "mt-2"} text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]`}>
            {audienceLabel}
          </p>
          {completedLabel ? (
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              {completedLabel}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}
