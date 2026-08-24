import styles from "./status.module.css";

type VoteProgressProps = {
  votesCast: number;
  voteGoal: number;
  isDone: boolean;
};

export function VoteProgress({ votesCast, voteGoal, isDone }: VoteProgressProps) {
  return (
    <div className={styles.progress}>
      <p className={styles.progressValue}>
        {votesCast}/{voteGoal} votes
      </p>
      <p className={styles.progressState}>{isDone ? "Ready" : "Waiting"}</p>
    </div>
  );
}
