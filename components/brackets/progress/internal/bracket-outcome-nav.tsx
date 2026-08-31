"use client";

import { useState } from "react";
import Link from "next/link";
import type { BracketOutcomeNavProps, BracketOutcomeView } from "../types";

function buildViewHref(bracketId: string, view: BracketOutcomeView) {
  if (view === "results") return `/results/${bracketId}`;
  return `/results/${bracketId}?view=${encodeURIComponent(view)}`;
}

export function BracketOutcomeNav({
  bracketId,
  activeView = "results",
  showResults = true,
  showRounds = false,
  showScoring = false,
  disabledReasonByKey = {},
  extraAction = null,
  className = "",
}: BracketOutcomeNavProps) {
  const [openReasonKey, setOpenReasonKey] = useState<BracketOutcomeView | null>(null);
  const items: { key: BracketOutcomeView; label: string }[] = [];
  if (showResults) items.push({ key: "results", label: "Results" });
  if (showRounds) items.push({ key: "rounds", label: "Rounds" });
  if (showScoring) items.push({ key: "scoring", label: "Scoring" });
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
                href={buildViewHref(bracketId, item.key)}
                className={item.key === activeView ? "results-outcome-nav-link results-outcome-nav-link-active" : "results-outcome-nav-link"}
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
          className="results-outcome-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`results-nav-disabled-title-${openReasonItem.key}`}
          onClick={() => setOpenReasonKey(null)}
        >
          <div className="results-outcome-dialog" onClick={(event) => event.stopPropagation()}>
            <p id={`results-nav-disabled-title-${openReasonItem.key}`} className="results-outcome-dialog-title">
              {openReasonItem.label}
            </p>
            <p className="results-outcome-dialog-copy">{disabledReasonByKey[openReasonItem.key] || "This view is not available right now."}</p>
            <div className="results-outcome-dialog-actions">
              <button type="button" onClick={() => setOpenReasonKey(null)} className="ui-button ui-button-accent">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
