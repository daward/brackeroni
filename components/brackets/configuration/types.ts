/** Public props and callbacks for bracket-configuration entry points. */
import type { BracketAdvancementMode, BracketPlayStyle, BracketResultMode, BracketTieBreakMode, SeedingStructure } from "@/lib/brackets/types";
import type { SeedingGroup, SeedingGroupEntry } from "./internal/seeding-draft";
import type { PoolSelectionOption } from "@/lib/pools/types";

export type AudienceMode = "private" | "friends" | "public";
export type SeedingMode = "pool_order" | "custom";

export type BracketStyleFieldProps = {
  value: BracketPlayStyle;
  onChange: (value: BracketPlayStyle) => void;
  className?: string;
  labelClassName?: string;
};

export type ResultModeFieldProps = {
  value: BracketResultMode;
  onChange: (value: BracketResultMode) => void;
  className?: string;
  isParallelParent?: boolean;
  labelClassName?: string;
  helpTitle?: string;
};

export type ParallelResultModeNoticeProps = {
  resultMode: BracketResultMode;
};

export type SeedingMoveTarget = {
  id: string;
  label: string;
  insertIndex: number;
};

export type SeedingAutosaveState = "idle" | "pending" | "saving" | "invalid" | "error";

export type SeedingModalProps = {
  tournament: { id: string } | null;
  groups?: SeedingGroup[];
  autosaveState?: SeedingAutosaveState;
  autosaveError?: string;
  loading: boolean;
  moveTargets?: SeedingMoveTarget[];
  draggingEntryId: string | null;
  onAddSubBracket: () => void;
  onCreateSubBracketAndMoveEntry: (entryId: string) => void;
  onRemoveFromPlayInAtIndex: (entryId: string, partnerEntryId: string) => void;
  onRemoveSubBracket: (groupId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onDragStart: (entryId: string) => void;
  onDragEnd: () => void;
  onDropIntoGroup: (group: SeedingGroup, insertIndex: number) => void;
  onMoveEntryIntoGroup: (entryId: string | null, group: SeedingGroup, insertIndex: number) => void;
  onRenameSubBracket: (groupId: string, name: string) => void;
  onTogglePlayInAtIndex: (entryId: string, partnerEntryId: string) => void;
  onToggleSubBracket: (groupId: string) => void;
};

export type BracketCreationInput = {
  title: string;
  source:
    | { type: "existing"; pool: PoolSelectionOption }
    | {
        type: "new";
        name: string;
        candidates: Array<{
          name: string;
          description?: string | null;
          imageUrl?: string | null;
          tags?: string[];
        }>;
      };
  playStyle: BracketPlayStyle;
  resultMode: BracketResultMode;
  advancementMode: BracketAdvancementMode;
  tieBreakMode: BracketTieBreakMode;
  seedingMode: SeedingMode;
  seedCandidateIds: string[] | null;
  audienceMode: AudienceMode;
};

export type UseSeedingActionsOptions = {
  setErrorMessage: (message: string) => void;
  setSuccessMessage: (message: string) => void;
  loadWorkspace: (options: { force: boolean }) => Promise<unknown>;
};

export type UseSeedingActionsResult = {
  addSeedingSubBracket: () => void;
  closeSeedingEditor: () => void;
  createSubBracketAndMoveEntry: (entryId: string) => void;
  draggingEntryId: string | null;
  handleSeedDropIntoGroup: (group: { id: string }, insertIndex: number) => void;
  handleSeedingSubmit: (event: { preventDefault(): void }) => void;
  moveEntryIntoGroup: (entryId: string, group: { id: string }, insertIndex: number) => void;
  moveEntryToSubBracket: (entryId: string, insertIndex: number) => void;
  openSeedingEditor: (tournament: { id: string }) => Promise<void>;
  removeFromPlayInAtIndex: (entryId: string, partnerId: string) => void;
  removeSeedingSubBracket: (id: string) => void;
  renameSeedingSubBracket: (id: string, name: string) => void;
  seedingAutosaveState: SeedingAutosaveState;
  seedingGroups: SeedingGroup[];
  seedingLoading: boolean;
  seedingMoveTargets: SeedingMoveTarget[];
  seedingSaveError: string;
  seedingStructure: SeedingStructure;
  seedingTournament: { id: string } | null;
  setDraggingEntryId: (entryId: string | null) => void;
  togglePlayInAtIndex: (entryId: string, partnerId: string) => void;
  toggleSeedingSubBracket: (id: string) => void;
};

export type BracketCreationWizardProps = {
  pools: PoolSelectionOption[];
  creating: boolean;
  onCancel: () => void;
  onCreate: (input: BracketCreationInput) => Promise<boolean>;
  onCreatePoolWorkspace?: () => void;
  initialPoolId?: string;
  initialConfig?: Partial<{
    title: string;
    sourcePoolId: string;
    playStyle: BracketPlayStyle;
    resultMode: BracketResultMode;
    advancementMode: BracketAdvancementMode;
    tieBreakMode: BracketTieBreakMode;
    audienceMode: AudienceMode;
  }> | null;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  fullPage?: boolean;
};

export type NewBracketSetupPageProps = {
  draftId?: string | null;
};
