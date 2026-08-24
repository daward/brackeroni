"use client";

import { LiveInfoRow } from "./live-info-row";
import { MutedSection } from "./muted-section";
import { LiveAccordion } from "./live-accordion";
import type { ParticipationTrackerPanelProps } from "./status-participation-types";
import { VoteProgress } from "./vote-progress";
import styles from "./status.module.css";

export function ParticipationTrackerPanel({ tournament, invitees, creatorVotesCast, activeRoundVoteGoal, creatorIsDone, summaryRows = [] }: ParticipationTrackerPanelProps) {
  if (tournament.visibility === "private") return <MutedSection title="Participation Tracker" body="Private brackets do not show participation tracking here." />;

  return (
    <LiveAccordion title="Participation Tracker" defaultOpen={false}>
      <div className={styles.trackerList}>
        {summaryRows.map((row) => (
          <LiveInfoRow key={row.title} title={row.title} meta={row.meta} action={row.action ?? null} />
        ))}
        {typeof creatorVotesCast === "number" && typeof activeRoundVoteGoal === "number" ? (
          <LiveInfoRow title="You" meta="Creator" action={<VoteProgress votesCast={creatorVotesCast} voteGoal={activeRoundVoteGoal} isDone={Boolean(creatorIsDone)} />} />
        ) : null}
        {tournament.sharingMode === "with_friends" ? (
          invitees.length > 0 ? (
            invitees.map((invite) => {
              const openMatchCount = invite.openMatchCount ?? 0;
              const votesCast = invite.votesCast ?? 0;
              const hasProgress = invite.openMatchCount !== undefined || invite.votesCast !== undefined;
              return (
                <LiveInfoRow
                  key={invite.id}
                  title={invite.name || invite.email || "Anonymous voter"}
                  meta={invite.email || invite.status}
                  action={
                    hasProgress ? (
                      <VoteProgress votesCast={votesCast} voteGoal={openMatchCount} isDone={openMatchCount > 0 && votesCast >= openMatchCount} />
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
