/**
 * Public UI for configuring bracket rules.
 *
 * Import bracket setup, rule controls, and seeding-editor UI only from this
 * feature root; implementation details remain private to `internal/`.
 */
export { BracketStyleField } from "./internal/bracket-style-field";
export { ParallelResultModeNotice } from "./internal/parallel-result-mode-notice";
export { ResultModeField } from "./internal/result-mode-field";
export { BracketCreationWizard } from "./internal/bracket-creation-wizard";
export { NewBracketSetupPage } from "./internal/new-bracket-setup-page";
export { SeedingModal } from "./internal/seeding-modal";
export { useSeedingActions } from "./internal/use-seeding-actions";
export { assignEntryToGroup, buildMoveTargets, buildSeedingGroups, createSeedingStructure, normalizeSeedingStructure, updateSubBracketName } from "./internal/seeding-draft";
export { moveEntryToIndex, removeFromPlayInAtIndexEntries, removeFromPlayInEntries, togglePlayInAtIndexEntries, togglePlayInEntries } from "./internal/seeding-entry-actions";
export { buildCanonicalSeedingPayload, buildSeedingSnapshot, createEmptySlot, hydrateSeedingEntries, validateSeedingEntries } from "./internal/seeding-entry-policy";
export type {
  BracketCreationInput,
  BracketCreationWizardProps,
  BracketStyleFieldProps,
  ParallelResultModeNoticeProps,
  NewBracketSetupPageProps,
  ResultModeFieldProps,
  SeedingAutosaveState,
  SeedingModalProps,
  SeedingMoveTarget,
  UseSeedingActionsOptions,
  UseSeedingActionsResult,
} from "./types";
