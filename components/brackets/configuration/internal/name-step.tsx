"use client";

import styles from "./review-step.module.css";

type NameStepProps = {
  title: string;
  onTitleChange: (title: string) => void;
};

export function NameStep({ title, onTitleChange }: NameStepProps) {
  return (
    <div className={styles.step}>
      <label className={styles.titleField}>
        <span className={styles.titleLabel}>What question do you want to ask?</span>
        <span className={styles.titleHelp}>This becomes your bracket name.</span>
        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Best sandwich in the world?"
          className={`ui-field display-face ${styles.titleInput}`}
        />
      </label>
    </div>
  );
}
