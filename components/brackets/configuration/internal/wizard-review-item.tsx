"use client";

import type { ComponentType } from "react";
import styles from "./wizard-review-item.module.css";

type Icon = ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
type WizardReviewItemProps = {
  icon: Icon;
  label: string;
  value: string;
  detail?: string | string[];
  onSelect?: () => void;
};

function ReviewItemContent({ icon: Icon, label, value, detail, editable }: Omit<WizardReviewItemProps, "onSelect"> & { editable: boolean }) {
  const detailLines = Array.isArray(detail) ? detail : detail ? [detail] : [];
  return (
    <>
      <span className={styles.labelRow}>
        <Icon aria-hidden="true" size={17} strokeWidth={2} />
        <span className="ui-section-kicker">{label}</span>
      </span>
      <p className={`display-face ${styles.value}`}>{value}</p>
      {detailLines.length ? (
        <span className={styles.detailList}>
          {detailLines.map((line) => (
            <span key={line} className={`ui-copy ${styles.detail}`}>
              {line}
            </span>
          ))}
        </span>
      ) : null}
      {editable ? <span className={`display-face ${styles.editLabel}`}>Edit</span> : null}
    </>
  );
}

export function WizardReviewItem({ icon, label, value, detail, onSelect }: WizardReviewItemProps) {
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={`${styles.item} ${styles.itemInteractive}`}>
        <ReviewItemContent icon={icon} label={label} value={value} detail={detail} editable />
      </button>
    );
  }
  return (
    <div className={styles.item}>
      <ReviewItemContent icon={icon} label={label} value={value} detail={detail} editable={false} />
    </div>
  );
}
