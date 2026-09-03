"use client";

import { Lightbulb } from "lucide-react";
import styles from "./wizard-choice.module.css";

type PresetGuidanceProps = {
  children: string;
};

export function PresetGuidance({ children }: PresetGuidanceProps) {
  return (
    <div className={styles.guidanceTip}>
      <span className={styles.guidanceIconFrame}>
        <Lightbulb aria-hidden="true" size={20} strokeWidth={2.25} className={styles.guidanceIcon} />
      </span>
      <p className={`ui-copy ${styles.guidanceCopy}`}>
        <span className={`display-face ${styles.guidanceLabel}`}>Tip</span>
        <span className={styles.guidanceText}>{children}</span>
      </p>
    </div>
  );
}
