import { TournamentMetaRow } from "./tournament-meta-row";
import type { DetailsPanelProps } from "./status-participation-types";
import styles from "./status.module.css";

export function DetailsPanel({ items }: DetailsPanelProps) {
  return (
    <div className={styles.details}>
      <TournamentMetaRow className={styles.detailsMeta} items={items} />
    </div>
  );
}
