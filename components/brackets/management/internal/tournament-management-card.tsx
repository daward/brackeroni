"use client";

import { ContentCard } from "@/components/shared";
import type { TournamentManagementCardProps } from "../types";
import styles from "./management.module.css";

export function TournamentManagementCard({ tournament, cardRef, isMuted, title, statusLabel, audienceLabel, completedLabel, children }: TournamentManagementCardProps) {
  const isComplete = tournament.status === "complete";
  const cardClassName = getCardClassName({ isComplete, isMuted });
  const statusDotClassName = getStatusDotClassName(statusLabel, tournament.status);

  return (
    <ContentCard ref={cardRef} className={cardClassName}>
      <div className={styles.managementCardHeader}>
        <div className={styles.managementCardTitle}>{title}</div>
        <div className={styles.managementCardMeta}>
          {tournament.status !== "complete" ? (
            <span className={styles.managementCardStatus}>
              <span className={statusDotClassName} aria-hidden="true" />
              <span>{statusLabel}</span>
            </span>
          ) : null}
          <p className={`${styles.managementCardAudience} ${isComplete ? styles.managementCardAudienceComplete : ""}`}>{audienceLabel}</p>
          {completedLabel ? <p className={styles.managementCardCompleted}>{completedLabel}</p> : null}
        </div>
      </div>
      {children}
    </ContentCard>
  );
}

function getCardClassName({ isComplete, isMuted }: { isComplete: boolean; isMuted?: boolean }) {
  const classes = [styles.managementCard];

  if (isComplete) {
    classes.push(styles.managementCardComplete);
  } else {
    classes.push(styles.managementCardActive);
  }

  if (isMuted) {
    classes.push(styles.managementCardMuted);
  }

  return classes.join(" ");
}

function getStatusDotClassName(statusLabel: string | null | undefined, status: string) {
  let toneClassName = styles.managementCardStatusMuted;

  if (statusLabel === "Saved") {
    toneClassName = styles.managementCardStatusSaved;
  } else if (status === "active") {
    toneClassName = styles.managementCardStatusActive;
  }

  return `${styles.managementCardStatusDot} ${toneClassName}`;
}
