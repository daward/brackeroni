"use client";

import { useState } from "react";
import { ResilientRemoteImage } from "@/components/shared";
import type { SeedingGroup, SeedingGroupEntry, SeedingMoveTarget } from "../types";
import styles from "./seeding-editor.module.css";

type SeedingEntryRowProps = {
  item: SeedingGroupEntry;
  rowIndex: number;
  group: SeedingGroup;
  groups: SeedingGroup[];
  moveTargets: SeedingMoveTarget[];
  draggingEntryId: string | null;
  onDragStart: (entryId: string) => void;
  onDragEnd: () => void;
  onMoveEntryIntoGroup: (entryId: string | null, group: SeedingGroup, insertIndex: number) => void;
  onRemoveFromPlayIn: (entryId: string, partnerEntryId: string) => void;
  onTogglePlayIn: (entryId: string, partnerEntryId: string) => void;
  onCreateSubBracket: (entryId: string) => void;
};

export function SeedingEntryRow({
  item,
  rowIndex,
  group,
  groups,
  moveTargets,
  draggingEntryId,
  onDragStart,
  onDragEnd,
  onMoveEntryIntoGroup,
  onRemoveFromPlayIn,
  onTogglePlayIn,
  onCreateSubBracket,
}: SeedingEntryRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { entry, index, displaySeed, isLocalPlayInSlot, canStartPlayIn, pairDirection } = item;
  const stateClassName = draggingEntryId === entry.id ? styles.entryDragging : "";
  const cursorClassName = entry.isEmptySlot ? styles.entryEmpty : styles.entryDraggable;
  const partner = pairDirection === "previous" ? group.entries[rowIndex - 1] : group.entries[rowIndex + 1];
  const candidateName = entry.candidateName || "Empty play-in slot";

  function runMenuAction(action: () => void) {
    action();
    setMenuOpen(false);
  }

  return (
    <div
      draggable={!entry.isEmptySlot}
      onDragStart={() => !entry.isEmptySlot && onDragStart(entry.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onMoveEntryIntoGroup(draggingEntryId, group, index);
      }}
      className={`${styles.entry} ${stateClassName} ${cursorClassName}`}
    >
      <div className={styles.entrySeedColumn}>
        <span className={`display-face ${styles.entrySeed}`}>{displaySeed ?? ""}</span>
        {isLocalPlayInSlot ? <span className={styles.entryFlag}>play-in</span> : null}
      </div>
      {entry.candidateImageUrl ? <ResilientRemoteImage src={entry.candidateImageUrl} alt={candidateName} className={styles.entryImage} /> : null}
      <div className={styles.entryContent}>
        <p className={`display-face ${styles.entryName}`}>{candidateName}</p>
        {entry.candidateDescription ? <p className={styles.entryDescription}>{entry.candidateDescription}</p> : null}
        {entry.isEmptySlot ? <p className={styles.entryFlag}>Empty slot</p> : null}
      </div>
      <div className={styles.entryActionCell}>
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className={`ui-button ui-button-muted ${styles.entryMenuButton}`}
          aria-label={`Actions for ${candidateName}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span aria-hidden="true">&#8942;</span>
        </button>
        {menuOpen ? (
          <div role="menu" className={styles.menu}>
            <div className={styles.entryMenuItems}>
              {isLocalPlayInSlot && partner?.entry.id ? (
                <button type="button" onClick={() => runMenuAction(() => onRemoveFromPlayIn(entry.id, partner.entry.id))} className={styles.menuAction}>
                  Remove from play-in
                </button>
              ) : null}
              {!isLocalPlayInSlot && canStartPlayIn && partner?.entry.id ? (
                <button type="button" onClick={() => runMenuAction(() => onTogglePlayIn(entry.id, partner.entry.id))} className={styles.menuAction}>
                  Create play-in
                </button>
              ) : null}
              {isLocalPlayInSlot || canStartPlayIn ? <div className={styles.menuSeparator} /> : null}
              {moveTargets.map((target) => {
                const targetGroup = groups.find((candidate) => candidate.id === target.id);
                return targetGroup ? (
                  <button
                    key={`${entry.id}-${target.id}`}
                    type="button"
                    onClick={() => runMenuAction(() => onMoveEntryIntoGroup(entry.id, targetGroup, target.insertIndex))}
                    className={`${styles.menuAction} ${styles.menuActionNeutral}`}
                  >
                    {target.label}
                  </button>
                ) : null;
              })}
              <button type="button" onClick={() => runMenuAction(() => onCreateSubBracket(entry.id))} className={`${styles.menuAction} ${styles.menuActionBordered}`}>
                New sub-bracket
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
