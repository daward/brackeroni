"use client";

import { DraftCandidateManager } from "./draft-candidate-manager";
import { DraftPoolControls } from "./draft-pool-controls";
import type { ManagedBracket } from "@/lib/brackets/types";
import type { DraftEntrantsProps, DraftPoolProps } from "../types";
import styles from "./draft.module.css";

type DraftPoolSectionProps = {
  tournament: ManagedBracket;
  pool: DraftPoolProps;
  entrants: DraftEntrantsProps;
};

export function DraftPoolSection({ tournament, pool, entrants }: DraftPoolSectionProps) {
  const { bracketDraft, hasSourcePool, isManagingEntrants } = pool;
  const poolId = bracketDraft.sourcePoolId;
  const createPool = async () => {
    if (pool.isPublishedTournament) return;
    pool.onClosePoolMenu();
    const createdPool = await pool.onCreatePool({
      name: pool.trimmedBracketTitle || "Untitled Pool",
      attachedTournamentId: tournament.id,
      switchToPools: false,
    });
    if (createdPool) {
      pool.onPatchDraft({ sourcePoolId: createdPool.id });
      pool.onToggleManageEntrants(true);
    }
  };
  const selectPool = (sourcePoolId: string) => {
    pool.onClosePoolMenu();
    pool.onPatchDraft({ sourcePoolId });
    if (!pool.isPublishedTournament) {
      pool.onPersistTournamentPatch({ sourcePoolId });
    }
  };
  return (
    <section className={`${styles.section} ${styles.surface}`}>
      <div className={styles.header}>
        <div>
          <p className={styles.heading}>{hasSourcePool ? `Pool: ${tournament.sourcePoolName || "Linked Pool"}` : "Pool"}</p>
          {!hasSourcePool ? <p className={styles.helper}>This bracket does not have entrants yet.</p> : null}
        </div>
        <DraftPoolControls tournament={tournament} pool={pool} onCreatePool={createPool} onSelectPool={selectPool} />
      </div>
      {isManagingEntrants && hasSourcePool ? (
        <DraftCandidateManager
          poolId={poolId}
          linkedPool={pool.linkedPool}
          isPublishedTournament={pool.isPublishedTournament}
          entrants={entrants}
          isActionPending={pool.isActionPending}
        />
      ) : null}
    </section>
  );
}
