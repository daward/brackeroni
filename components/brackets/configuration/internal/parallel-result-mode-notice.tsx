"use client";

import { isParallelResultMode } from "@/lib/bracket-modes";
import type { ParallelResultModeNoticeProps } from "../types";
import styles from "./parallel-result-mode-notice.module.css";

export function ParallelResultModeNotice({ resultMode }: ParallelResultModeNoticeProps) {
  if (!isParallelResultMode(resultMode)) {
    return null;
  }

  const message =
    resultMode === "parallel_partial_ranking"
      ? "Each participant completes a personal bracket that locks in the top half, then orders the rest by performance. Final results are aggregated from those completed rankings."
      : "Each participant completes a personal full-ranking bracket from this pool. Final results are aggregated from those completed rankings.";

  return (
    <div className={styles.spanTwo}>
      <p className={styles.notice}>{message}</p>
    </div>
  );
}
