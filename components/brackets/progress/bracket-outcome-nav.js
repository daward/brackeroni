"use client";

import { useState } from "react";
import Link from "next/link";

function buildViewHref(tournamentId, view) {
  return view === "results"
    ? `/results/${tournamentId}`
    : `/results/${tournamentId}?view=${encodeURIComponent(view)}`;
}

export function BracketOutcomeNav({
  tournamentId,
  activeView = "results",
  showResults = true,
  showRounds = false,
  showScoring = false,
  disabledReasonByKey = {},
  extraAction = null,
  className = ""
}) {
  const [openReasonKey, setOpenReasonKey] = useState(null);
  const items = [
    showResults ? { key: "results", label: "Results" } : null,
    showRounds ? { key: "rounds", label: "Rounds" } : null,
    showScoring ? { key: "scoring", label: "Scoring" } : null
  ].filter(Boolean);
  const openReasonItem = items.find((item) => item.key === openReasonKey) ?? null;

  return (
    <>
      <div className={`results-outcome-nav ${className}`.trim()}>
        <div className="results-outcome-nav-tabs">
          {items.map((item) => {
            const disabledReason = disabledReasonByKey[item.key] || "";

            if (disabledReason && item.key !== activeView) {
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={disabledReason}
                  onClick={() => setOpenReasonKey(item.key)}
                  className="results-outcome-nav-link results-outcome-nav-link-disabled"
                >
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                key={item.key}
                href={buildViewHref(tournamentId, item.key)}
                className={
                  item.key === activeView
                    ? "results-outcome-nav-link results-outcome-nav-link-active"
                    : "results-outcome-nav-link"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        {extraAction ? <div className="results-outcome-nav-extra">{extraAction}</div> : null}
      </div>
      {openReasonItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.72)] px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`results-nav-disabled-title-${openReasonItem.key}`}
          onClick={() => setOpenReasonKey(null)}
        >
          <div
            className="w-full max-w-sm border border-[var(--line-strong)] bg-[var(--panel)] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <p
              id={`results-nav-disabled-title-${openReasonItem.key}`}
              className="display-face text-lg font-black"
            >
              {openReasonItem.label}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--ink)]/88">
              {disabledReasonByKey[openReasonItem.key] || "This view is not available right now."}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setOpenReasonKey(null)}
                className="ui-button ui-button-accent"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
