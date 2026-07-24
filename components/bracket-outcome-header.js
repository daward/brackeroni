"use client";

export function BracketOutcomeHeader({
  title,
  meta,
  outcomeNav = null,
  headerAction = null,
  headerNotice = null,
  className = ""
}) {
  return (
    <header className={`results-header ${className}`.trim()}>
      <div className="results-header-row">
        <div className="results-header-copy">
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
