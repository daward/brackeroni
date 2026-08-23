"use client";

import type { ReactNode } from "react";
import { TournamentMetaRow } from "./tournament-management";
import { LiveAccordion } from "./status-layout-primitives";
import styles from "./status.module.css";
import type { BracketInvite, ManagedBracket } from "@/lib/brackets/types";

type SummaryRow = { title: string; meta: string; action?: ReactNode };
type ParticipationTrackerPanelProps = {
  tournament: ManagedBracket;
  invitees: BracketInvite[];
  creatorVotesCast?: number;
  activeRoundVoteGoal?: number;
  creatorIsDone?: boolean;
  summaryRows?: SummaryRow[];
};
type DetailsPanelProps = { items: Array<ReactNode | null | undefined | false> };
type LiveInfoRowProps = {
  title: string;
  meta?: string | null;
  action?: ReactNode;
};

function MutedSection({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.mutedSection}>
      <div className={styles.mutedHeading}>{title}</div>
      <div className={styles.mutedBody}>
        <p>{body}</p>
      </div>
    </div>
  );
}

function LiveInfoRow({ title, meta = null, action = null }: LiveInfoRowProps) {
  return (
    <div className={styles.infoRow}>
      <div className={styles.infoContent}>
        <p className={styles.infoTitle}>{title}</p>
        {meta ? <p className={styles.infoMeta}>{meta}</p> : null}
      </div>
      {action ? <div className={styles.infoAction}>{action}</div> : null}
    </div>
  );
}

function VoteProgress({ votesCast, voteGoal, isDone }: { votesCast: number; voteGoal: number; isDone: boolean }) {
  return (
    <div className={styles.progress}>
      <p className={styles.progressValue}>
        {votesCast}/{voteGoal} votes
      </p>
      <p className={styles.progressState}>{isDone ? "Ready" : "Waiting"}</p>
    </div>
  );
}

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

export function DetailsPanel({ items }: DetailsPanelProps) {
  return (
    <div className={styles.details}>
      <TournamentMetaRow className={styles.detailsMeta} items={items} />
    </div>
  );
}
