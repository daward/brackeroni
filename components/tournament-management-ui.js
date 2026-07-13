"use client";

import Link from "next/link";

export function TournamentMetaRow({
  items,
  separator = "dot",
  className = "flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]"
}) {
  const visibleItems = items.filter(Boolean);

  if (visibleItems.length === 0) {
    return null;
  }

  const separatorLabel = separator === "slash" ? "/" : "•";

  return (
    <div className={className}>
      {visibleItems.map((item, index) => (
        <span key={`${item}-${index}`} className="contents">
          {index > 0 ? <span>{separatorLabel}</span> : null}
          <span>{item}</span>
        </span>
      ))}
    </div>
  );
}

export function TournamentActionGroup({
  actions,
  layout = "column",
  className = ""
}) {
  const visibleActions = actions.filter(Boolean);

  if (visibleActions.length === 0) {
    return null;
  }

  const layoutClassName =
    layout === "row"
      ? "flex flex-wrap gap-3 lg:justify-end"
      : "flex flex-col gap-3";

  return (
    <div className={`${layoutClassName} ${className}`.trim()}>
      {visibleActions.map((action) => {
        if (action.href) {
          return (
            <Link
              key={action.key}
              href={action.href}
              className={action.className}
            >
              {action.label}
            </Link>
          );
        }

        return (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={action.className}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
