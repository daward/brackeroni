"use client";

import Link from "next/link";
import type { TournamentActionGroupProps } from "../types";

export function TournamentActionGroup({ actions, layout = "column", align = "end", className = "" }: TournamentActionGroupProps) {
  const visibleActions = actions.filter((action): action is NonNullable<typeof action> => Boolean(action));

  if (visibleActions.length === 0) {
    return null;
  }

  const layoutClassName =
    layout === "row"
      ? `flex flex-wrap gap-3 ${{ start: "lg:justify-start", center: "lg:justify-center", end: "lg:justify-end" }[align]}`
      : "flex flex-col gap-3";

  return (
    <div className={`${layoutClassName} ${className}`.trim()}>
      {visibleActions.map((action) => {
        if (action.render) {
          return <span key={action.key}>{action.render()}</span>;
        }

        if (action.href) {
          return (
            <Link key={action.key} href={action.href} className={action.className}>
              {action.label}
            </Link>
          );
        }

        return (
          <button key={action.key} type="button" onClick={action.onClick} disabled={action.disabled} className={action.className}>
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
