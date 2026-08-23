"use client";

import type { DragEvent } from "react";
import type { SeedingGroup, SeedingMoveTarget } from "../types";
import { SeedingEntryRow } from "./seeding-entry-row";
import styles from "./seeding-editor.module.css";

type SeedingGroupSectionProps = {
  group: SeedingGroup;
  allGroups: SeedingGroup[];
  showHeader: boolean;
  moveTargets: SeedingMoveTarget[];
  draggingEntryId: string | null;
  onDragStart: (entryId: string) => void;
  onDragEnd: () => void;
  onDropIntoGroup: (group: SeedingGroup, insertIndex: number) => void;
  onMoveEntryIntoGroup: (entryId: string | null, group: SeedingGroup, insertIndex: number) => void;
  onRename: (groupId: string, name: string) => void;
  onToggle: (groupId: string) => void;
  onRemove: (groupId: string) => void;
  onRemoveFromPlayIn: (entryId: string, partnerEntryId: string) => void;
  onTogglePlayIn: (entryId: string, partnerEntryId: string) => void;
  onCreateSubBracket: (entryId: string) => void;
};

function getDropInsertIndex(group: SeedingGroup) {
  if (group.isEmpty) return group.startIndex;
  return (group.entries.at(-1)?.index ?? group.startIndex) + 1;
}

export function SeedingGroupSection({
  group,
  allGroups,
  showHeader,
  moveTargets,
  draggingEntryId,
  onDragStart,
  onDragEnd,
  onDropIntoGroup,
  onMoveEntryIntoGroup,
  onRename,
  onToggle,
  onRemove,
  onRemoveFromPlayIn,
  onTogglePlayIn,
  onCreateSubBracket,
}: SeedingGroupSectionProps) {
  const insertIndex = getDropInsertIndex(group);
  const isCollapsed = Boolean(group.isCollapsed);
  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    onDropIntoGroup(group, insertIndex);
  }
  return (
    <section className={styles.group}>
      {showHeader ? (
        <div className={styles.groupHeader} onDragOverCapture={(event) => event.preventDefault()} onDropCapture={handleDrop}>
          <div className="min-w-0 flex-1">
            <input
              value={group.name}
              onChange={(event) => onRename(group.id, event.target.value)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => event.preventDefault()}
              className={styles.groupName}
            />
          </div>
          <div className="flex items-center gap-2">
            {group.id !== "__root__" ? (
              <button type="button" onClick={() => onRemove(group.id)} className="ui-button ui-button-muted min-h-[36px] px-3 py-2 text-[10px]">
                Remove
              </button>
            ) : null}
            <button type="button" onClick={() => onToggle(group.id)} className="ui-button ui-button-muted min-h-[36px] px-3 py-2 text-[10px]">
              {isCollapsed ? "Open" : "Close"}
            </button>
          </div>
        </div>
      ) : null}
      {!isCollapsed ? (
        <div className={`${styles.groupBody} space-y-2`}>
          {group.isEmpty ? (
            <div className={styles.emptyGroup} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
              Empty sub-bracket. Drag entries here next.
            </div>
          ) : null}
          {group.entries.map((item, rowIndex) => (
            <SeedingEntryRow
              key={item.entry.id}
              item={item}
              rowIndex={rowIndex}
              group={group}
              groups={allGroups}
              moveTargets={moveTargets}
              draggingEntryId={draggingEntryId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onMoveEntryIntoGroup={onMoveEntryIntoGroup}
              onRemoveFromPlayIn={onRemoveFromPlayIn}
              onTogglePlayIn={onTogglePlayIn}
              onCreateSubBracket={onCreateSubBracket}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
