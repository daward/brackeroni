import { CandidateTagList } from "./candidate-tag-list";
import { ImageRailCard } from "@/components/shared";
import styles from "./candidate-pool-card.module.css";
import type { CandidatePoolCardProps } from "../types";

export function CandidatePoolCard({ candidate, readOnly = false, expanded = false, removing = false, onActivate, onRemove }: CandidatePoolCardProps) {
  return (
    <div className={`${styles.container} ${candidate.imageUrl ? styles.hasImage : ""} ${expanded ? styles.expanded : ""}`}>
      <ImageRailCard
        type="button"
        onClick={onActivate}
        as="button"
        imageUrl={candidate.imageUrl}
        imageAlt={candidate.name}
        className={`${styles.card} ${styles.action}`}
        railClassName={styles.rail}
      >
        <p className={`${styles.title} display-face`}>{candidate.name}</p>
        <CandidateTagList tags={candidate.tags} limit={expanded ? null : 2} className={styles.tags} />
        {candidate.description ? <p className={styles.description}>{candidate.description}</p> : null}
      </ImageRailCard>
      {candidate.sourceUrl ? (
        <a
          href={candidate.sourceUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open source for ${candidate.name}`}
          title={`Open source for ${candidate.name}`}
          className={styles.source}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
            <path d="M14 5h5v5" />
            <path d="M10 14 19 5" />
            <path d="M19 14v5H5V5h5" />
          </svg>
        </a>
      ) : null}
      {!readOnly ? (
        <button type="button" onClick={onRemove} aria-label={`Remove ${candidate.name}`} title={`Remove ${candidate.name}`} disabled={removing} className={styles.remove}>
          {removing ? (
            <span className={styles.removePending}>...</span>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
              <path d="M4 7h16" />
              <path d="M9 7V4h6v3" />
              <path d="M7 7l1 13h8l1-13" />
              <path d="M10 11v5" />
              <path d="M14 11v5" />
            </svg>
          )}
        </button>
      ) : null}
    </div>
  );
}
