import styles from "./status.module.css";

type VoteProgressProps = {
  votesCast: number;
  voteGoal: number;
};

export function VoteProgress({ votesCast, voteGoal }: VoteProgressProps) {
  return (
    <div className={styles.progress}>
      <p className={styles.progressValue}>
        {votesCast} out of {voteGoal} with votes
      </p>
    </div>
  );
}
