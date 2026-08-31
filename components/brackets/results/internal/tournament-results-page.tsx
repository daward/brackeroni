"use client";

import { useState } from "react";
import { formatResultModeLabel, usesOpenEndedRankingMode } from "@/lib/brackets/engine/result-modes";
import type { TournamentResultsPageProps } from "../types";
import { BracketOutcomeHeader } from "./bracket-outcome-header";
import { ResultEntryDetails } from "./result-entry-details";
import { ResultsRankingList } from "./results-ranking-list";
import { getDisplayRank, orderResultEntries } from "./tournament-result-ordering";
import { isVisibleHistoryMatch } from "./tournament-result-history";
import { buildEntrySeedDisplay, formatSeedLabel } from "./tournament-seed-display";

export function TournamentResultsPage({
  tournament,
  matches,
  outcomeNav = null,
  headerAction = null,
  headerNotice = null,
}: TournamentResultsPageProps) {
  const orderedEntries = orderResultEntries(tournament.entries ?? [], matches ?? [], tournament);
  const seedDisplayByEntryId = buildEntrySeedDisplay(tournament.entries ?? [], tournament.seedingStructure || {});
  const [selectedEntryId, setSelectedEntryId] = useState(orderedEntries[0]?.id ?? null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const selectedEntry = orderedEntries.find((entry) => entry.id === selectedEntryId) ?? orderedEntries[0] ?? null;
  const selectedEntryHistory = selectedEntry
    ? matches.filter((match) => {
        return isVisibleHistoryMatch(match) && (match.left?.id === selectedEntry.id || match.right?.id === selectedEntry.id);
      })
    : [];
  const rankingTitle =
    usesOpenEndedRankingMode(tournament.resultMode) && tournament.status !== "complete" ? "Ranking Progress" : "Final Ranking";

  function handleSelectEntry(entryId: string) {
    setSelectedEntryId(entryId);

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsDrawerOpen(true);
    }
  }

  return (
    <div className="results-page">
      <section className="results-shell">
        <BracketOutcomeHeader
          title={tournament.title}
          meta={`${formatResultModeLabel(tournament.resultMode)} | ${orderedEntries.length} ranked entries`}
          outcomeNav={outcomeNav}
          headerAction={headerAction}
          headerNotice={headerNotice}
        />

        <div className="results-grid">
          <section className="results-ranking-rail">
            <h2 className="results-section-title">{rankingTitle}</h2>
            <ResultsRankingList
              entries={orderedEntries}
              selectedEntryId={selectedEntry?.id}
              onSelectEntry={handleSelectEntry}
              getRank={(entry, index) => getDisplayRank(entry, orderedEntries, index)}
              getSeedLabel={(entry) => formatSeedLabel(seedDisplayByEntryId, entry.id, entry.seed)}
            />
          </section>

          <aside className="results-details-rail ui-scroll-subtle">
            <ResultEntryDetails
              tournament={tournament}
              orderedEntries={orderedEntries}
              selectedEntry={selectedEntry}
              selectedEntryHistory={selectedEntryHistory}
              seedDisplayByEntryId={seedDisplayByEntryId}
            />
          </aside>
        </div>
      </section>
      {isDrawerOpen && selectedEntry ? (
        <div className="results-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="results-drawer ui-scroll-subtle" onClick={(event) => event.stopPropagation()}>
            <div className="results-drawer-header">
              <p className="results-section-title">Candidate Details</p>
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="results-drawer-close">
                Close
              </button>
            </div>
            <ResultEntryDetails
              tournament={tournament}
              orderedEntries={orderedEntries}
              selectedEntry={selectedEntry}
              selectedEntryHistory={selectedEntryHistory}
              seedDisplayByEntryId={seedDisplayByEntryId}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
