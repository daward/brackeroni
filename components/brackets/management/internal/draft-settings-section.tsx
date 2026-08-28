"use client";

import { BracketStyleField, ResultModeField } from "@/components/brackets/configuration";
import { formatBracketRuleLabel, getTournamentAudienceMode, getTournamentAudiencePatch } from "./presentation";
import { isParallelResultMode } from "@/lib/brackets/engine/result-modes";
import type { BracketAudienceMode, BracketPlayStyle, BracketResultMode, BracketTieBreakMode } from "@/lib/brackets/types";
import type { DraftSettingsProps } from "../types";
import styles from "./draft.module.css";

export function DraftSettingsSection({
  bracketDraft,
  isParallelParent,
  isPublishedTournament,
  onPatchDraft,
  onPersistTournamentPatch,
  onToggleRules,
  rulesExpanded,
}: DraftSettingsProps) {
  function persistPatch(patch: Parameters<typeof onPatchDraft>[0]) {
    onPatchDraft(patch);
    onPersistTournamentPatch(patch);
  }

  return (
    <div className={styles.settingsGrid}>
      <div className={styles.surface}>
        <p className={`${styles.heading} ${styles.headingWithMargin}`}>Bracket Access</p>
        <select
          aria-label="Bracket Access"
          value={getTournamentAudienceMode(bracketDraft)}
          disabled={isPublishedTournament}
          onChange={(event) => persistPatch(getTournamentAudiencePatch(event.target.value as BracketAudienceMode))}
          className="ui-field ui-field-panel ui-field-select"
        >
          <option value="private">Private</option>
          <option value="with_friends">Friends</option>
          <option value="public_listed">Public</option>
          <option value="public_unlisted">Public Unlisted</option>
        </select>
      </div>

      <div className={styles.surface}>
        <div className={styles.settingsHeader}>
          <div>
            <p className={styles.ruleSummary}>
              {bracketDraft.playStyle.replace("_", " ")} {" / "}
              {formatBracketRuleLabel(bracketDraft.resultMode)} {" / "}
              {formatBracketRuleLabel(bracketDraft.advancementMode || "vote_winner")} {" / "}
              {bracketDraft.tieBreakMode.replace("_", " ")}
            </p>
            {isPublishedTournament ? <p className={styles.lockedNotice}>Published brackets are locked in create.</p> : null}
          </div>
          {!isPublishedTournament ? (
            <button type="button" onClick={onToggleRules} className={styles.editRulesButton}>
              {rulesExpanded ? "Hide Rules" : "Edit Rules"}
            </button>
          ) : null}
        </div>
        {rulesExpanded && !isPublishedTournament ? (
          <div className={styles.rulesGrid}>
            <BracketStyleField
              value={bracketDraft.playStyle}
              onChange={(playStyle: BracketPlayStyle) => persistPatch({ playStyle })}
              className="ui-field ui-field-panel ui-field-select"
            />
            <ResultModeField
              value={bracketDraft.resultMode}
              isParallelParent={isParallelParent}
              onChange={(resultMode: BracketResultMode) => {
                onPatchDraft({ resultMode });
                if (!isParallelResultMode(resultMode)) onPersistTournamentPatch({ resultMode });
              }}
              className="ui-field ui-field-panel ui-field-select"
            />
            <label className={styles.fieldGroup}>
              <span className={styles.heading}>Advancement</span>
              <select
                aria-label="Advancement"
                value={bracketDraft.advancementMode || "vote_winner"}
                onChange={(event) =>
                  persistPatch({
                    advancementMode: event.target.value as "vote_winner" | "manual_winner",
                  })
                }
                className="ui-field ui-field-panel ui-field-select"
              >
                <option value="vote_winner">Vote Winner</option>
                <option value="manual_winner">Manual Winner</option>
              </select>
            </label>
            <label className={styles.fieldGroup}>
              <span className={styles.heading}>Tie Break</span>
              <select
                aria-label="Tie Break"
                value={bracketDraft.tieBreakMode}
                onChange={(event) => persistPatch({ tieBreakMode: event.target.value as BracketTieBreakMode })}
                className="ui-field ui-field-panel ui-field-select"
              >
                <option value="higher_seed_wins">Higher Seed Wins</option>
                <option value="random">Random</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
}
