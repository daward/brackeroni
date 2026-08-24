import styles from "./status.module.css";

type MutedSectionProps = {
  title: string;
  body: string;
};

export function MutedSection({ title, body }: MutedSectionProps) {
  return (
    <div className={styles.mutedSection}>
      <div className={styles.mutedHeading}>{title}</div>
      <div className={styles.mutedBody}>
        <p>{body}</p>
      </div>
    </div>
  );
}
