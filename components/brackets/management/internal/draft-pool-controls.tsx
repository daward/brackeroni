"use client";

import { DraftPoolMenu } from "./draft-pool-menu";
import type { DraftPoolControlsProps } from "../types";
import styles from "./draft.module.css";

export function DraftPoolControls({ tournament, pool, onCreatePool, onSelectPool }: DraftPoolControlsProps) {
  const {
    bracketDraft,
    pools,
    hasSourcePool,
    isPublishedTournament,
    isParallelParent,
    isManagingEntrants,
    isPoolMenuOpen,
    isActionPending,
    onToggleManageEntrants,
    onTogglePoolMenu,
    onOpenSeedingEditor,
    onSyncWithPool,
  } = pool;

  return (
    <div className={styles.poolActions}>
      {hasSourcePool ? (
        <>
          <button type="button" onClick={() => onToggleManageEntrants()} disabled={isPublishedTournament} className="ui-button ui-button-accent">
            {isManagingEntrants ? "Close Entrants" : "Manage Candidates"}
          </button>
          <button type="button" onClick={onTogglePoolMenu} disabled={isPublishedTournament} className="ui-button ui-button-muted">
            Pick Pool
          </button>
          {!isParallelParent ? (
            <button
              type="button"
              onClick={onSyncWithPool}
              disabled={isPublishedTournament || isActionPending(`sync-tournament:${tournament.id}`)}
              className="ui-button ui-button-muted"
            >
              {isActionPending(`sync-tournament:${tournament.id}`) ? "Syncing" : "Sync With Pool"}
            </button>
          ) : null}
          {isPoolMenuOpen ? (
            <DraftPoolMenu
              pools={pools}
              selectedPoolId={bracketDraft.sourcePoolId}
              isDisabled={isPublishedTournament}
              isCreatePending={false}
              onCreatePool={onCreatePool}
              onSelectPool={onSelectPool}
              showCurrentPool
            />
          ) : null}
          <button type="button" onClick={onOpenSeedingEditor} disabled={isPublishedTournament} className="ui-button ui-button-muted">
            Set Seeding
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={onTogglePoolMenu} disabled={isPublishedTournament} className="ui-button ui-button-muted">
            Pick Pool
          </button>
          {isPoolMenuOpen ? (
            <DraftPoolMenu
              pools={pools}
              selectedPoolId={bracketDraft.sourcePoolId}
              isDisabled={isPublishedTournament}
              isCreatePending={isActionPending(`create-pool-for-tournament:${tournament.id}`)}
              onCreatePool={onCreatePool}
              onSelectPool={onSelectPool}
              showCurrentPool={false}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
