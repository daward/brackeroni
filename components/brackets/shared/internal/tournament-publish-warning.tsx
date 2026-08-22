import type { TournamentPublishWarningProps } from "../types";
import styles from "./tournament-publish-warning.module.css";

export function TournamentPublishWarning({ visibility }: TournamentPublishWarningProps) {
  if (visibility === "private") return null;

  return (
    <p className={styles.warning}>
      Public brackets stay editable until you start them. Starting the bracket publishes it and
      locks further create changes.
    </p>
  );
}
