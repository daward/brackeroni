import styles from "./candidate-tag-list.module.css";
import type { CandidateTagListProps } from "../types";

export function CandidateTagList({ tags = [], className = "", limit = null }: CandidateTagListProps) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  const visibleTags = typeof limit === "number" && Number.isInteger(limit) ? tags.slice(0, limit) : tags;
  const remainingCount = Math.max(tags.length - visibleTags.length, 0);

  return (
    <div className={`${styles.list} ${className}`.trim()}>
      {visibleTags.map((tag) => (
        <span key={tag} className={styles.tag}>
          {tag}
        </span>
      ))}
      {remainingCount ? <span className={`${styles.tag} ${styles.remaining}`}>+{remainingCount}</span> : null}
    </div>
  );
}
