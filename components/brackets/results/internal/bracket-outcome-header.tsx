"use client";

import type { BracketOutcomeHeaderProps } from "../types";

export function BracketOutcomeHeader({ title, meta, kicker = null, outcomeNav = null, headerAction = null, headerNotice = null, className = "" }: BracketOutcomeHeaderProps) {
  return (
    <header className={`results-header ${className}`.trim()}>
      <div className="results-header-row">
        <div className="results-header-copy">
          {kicker ? <p className="results-kicker">{kicker}</p> : null}
          <h1 className="results-title">{title}</h1>
          {meta ? <p className="results-meta">{meta}</p> : null}
          {outcomeNav ? <div className="mt-5">{outcomeNav}</div> : null}
          {headerNotice ? <div className="mt-4">{headerNotice}</div> : null}
        </div>
        {headerAction ? <div className="results-header-action">{headerAction}</div> : null}
      </div>
    </header>
  );
}
