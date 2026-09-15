"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { MutedSection } from "./muted-section";
import { LiveAccordion } from "./live-accordion";
import type { ParticipationTrackerPanelProps } from "./status-participation-types";
import { VoteProgress } from "./vote-progress";
import styles from "./status.module.css";

export function ParticipationTrackerPanel({
  tournament,
  invitees,
  creatorVotesCast,
  activeRoundVoteGoal,
  creatorIsDone,
  summaryRows = [],
  updatedAt = null,
  isRefreshing = false,
  onRefresh,
}: ParticipationTrackerPanelProps) {
  if (tournament.visibility === "private") return <MutedSection title="Participation Tracker" body="Private brackets do not show participation tracking here." />;

  return (
    <LiveAccordion title="Participation Tracker" defaultOpen={false}>
      <div className={styles.trackerList}>
        <div className={styles.trackerToolbar}>
          <p className={styles.trackerUpdated}>{formatTrackerUpdatedAt(updatedAt)}</p>
          {onRefresh ? (
            <button
              type="button"
              className={`ui-button ui-button-accent ${styles.trackerRefreshButton}`}
              disabled={isRefreshing}
              aria-label="Refresh stats"
              title="Refresh stats"
              onClick={onRefresh}
            >
              <RefreshCw aria-hidden="true" size={18} className={isRefreshing ? styles.refreshIconSpinning : undefined} />
            </button>
          ) : null}
        </div>
        {summaryRows.map((row) => (
          <TrackerRow key={row.title} label={row.title} value={row.action ?? row.meta} />
        ))}
        {typeof creatorVotesCast === "number" && typeof activeRoundVoteGoal === "number" ? (
          <TrackerRow
            label="Your Matchup Activity"
            value={<VoteProgress votesCast={creatorVotesCast} voteGoal={activeRoundVoteGoal} />}
          />
        ) : null}
        {tournament.sharingMode === "with_friends" ? (
          invitees.length > 0 ? (
            invitees.map((invite) => {
              const openMatchCount = invite.openMatchCount ?? 0;
              const votesCast = invite.votesCast ?? 0;
              const hasProgress = invite.openMatchCount !== undefined || invite.votesCast !== undefined;
              return (
                <TrackerRow
                  key={invite.id}
                  label={invite.name || invite.email || "Anonymous voter"}
                  value={
                    hasProgress ? (
                      <VoteProgress votesCast={votesCast} voteGoal={openMatchCount} />
                    ) : (
                      <span className={styles.inviteStatus}>{invite.status}</span>
                    )
                  }
                />
              );
            })
          ) : (
            <p className={styles.emptyMessage}>No invited voters have joined yet.</p>
          )
        ) : summaryRows.length === 0 ? (
          <p className={styles.emptyMessage}>This bracket is not in friends mode, so there is no per-person participation list.</p>
        ) : null}
      </div>
    </LiveAccordion>
  );
}

function TrackerRow({
  label,
  value,
}: {
  label: string;
  value?: ReactNode;
}) {
  return (
    <div className={styles.trackerRow}>
      <div className={styles.trackerRowLabel}>
        <p className={styles.infoTitle}>{label}</p>
      </div>
      {value ? <div className={styles.trackerRowValue}>{value}</div> : null}
    </div>
  );
}

function formatTrackerUpdatedAt(value: string | Date | null) {
  if (!value) {
    return "Stats loaded with page";
  }

  return `Stats updated ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))}`;
}
