import styles from "./candidate-tag-management-section.module.css";
import type { CandidateTagManagement } from "../types";

type Props = {
  tags: {
    sortedTags: [string, number][];
    lowValueThreshold: string;
    onLowValueThresholdChange: (threshold: string) => void;
  };
  management: Omit<CandidateTagManagement, "showControl">;
};

export function CandidateTagManagementSection({ tags, management }: Props) {
  const { sortedTags, lowValueThreshold, onLowValueThresholdChange } = tags;
  const { isRemoveTagPending, isRemoveLowValueTagsPending, onRemoveTag, onRemoveLowValueTags } = management;
  const isRemovingLowValueTags = Boolean(isRemoveLowValueTagsPending?.(Number(lowValueThreshold)));

  return (
    <section className={styles.section}>
      <div>
        <p className={`ui-section-kicker ${styles.dangerHeading}`}>Delete Tag</p>
        <p className="ui-copy">Remove one tag everywhere, or clear tags with low usage.</p>
      </div>
      <div className={styles.thresholdControl}>
        <label className={styles.thresholdLabel}>
          <span className="ui-section-kicker">Remove Tags Used By</span>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={lowValueThreshold}
            onChange={(event) => onLowValueThresholdChange(event.target.value)}
            className="ui-field ui-field-panel"
          />
        </label>
        <button
          type="button"
          onClick={() => onRemoveLowValueTags?.(Number(lowValueThreshold))}
          disabled={isRemovingLowValueTags}
          className={`ui-button ui-button-muted ui-button-compact ${styles.deleteButton}`}
        >
          {isRemovingLowValueTags ? "Removing" : "Delete <= X"}
        </button>
      </div>
      <p className={`ui-section-kicker ${styles.individualHeading}`}>Delete Individually</p>
      <div className={styles.tagRows}>
        {sortedTags.map(([tag, count]) => {
          const isRemovingTag = Boolean(isRemoveTagPending?.(tag));

          return (
            <div key={tag} className={styles.tagRow}>
              <div className={styles.tagInformation}>
                <p className={styles.tagName}>{tag}</p>
                <p className={`ui-meta ${styles.tagCount}`}>
                  {count} candidate{count === 1 ? "" : "s"}
                </p>
              </div>
              <button type="button" onClick={() => onRemoveTag?.(tag)} disabled={isRemovingTag} className={`ui-button ui-button-muted ui-button-compact ${styles.deleteButton}`}>
                {isRemovingTag ? "Removing" : "Delete"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
