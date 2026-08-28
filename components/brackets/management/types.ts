/** Public contracts for creator-workspace bracket-management components and callbacks. */
import type { ReactNode, Ref } from "react";
import type { CandidateDraft, ImageSuggestion, PoolCandidate } from "@/components/pools/candidates";
import type { BracketDraft, BracketInvite, BracketMatch, Bracket } from "@/lib/brackets/types";
import type { ManagedPool } from "@/lib/pools/types";

/** A labeled action rendered by the management action groups. */
export type TournamentAction = {
  key: string;
  label?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  className?: string;
  render?: () => ReactNode;
};

export type PendingTournamentAction = (key: string) => boolean;
export type BracketLabelFormatter = (value?: string | null) => string;
export type BracketAudienceDescriber = (bracket: Bracket) => string;
export type BracketPatch = Partial<BracketDraft>;
export type BracketPoolOption = {
  id: string;
  name: string;
  candidateCount?: number | null;
};
export type BracketShareLink = { id: string } | null;

export type TournamentMetaRowProps = {
  items: Array<ReactNode | null | undefined | false>;
  separator?: "dot" | "slash";
  className?: string;
};

export type TournamentActionGroupProps = {
  actions: Array<TournamentAction | null | undefined>;
  layout?: "column" | "row";
  align?: "start" | "center" | "end";
  className?: string;
};

export type StatusActionRowProps = {
  actions: TournamentAction[];
};

export type CloseVotingButtonProps = {
  label?: string;
  className: string;
  disabled?: boolean;
  disabledReason?: string;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

export type TournamentManagementCardProps = {
  tournament: Bracket;
  cardRef?: Ref<HTMLDivElement>;
  isMuted?: boolean;
  title: ReactNode;
  statusLabel?: string;
  audienceLabel: string;
  completedLabel?: string | null;
  children?: ReactNode;
};

export type DraftSettingsProps = {
  bracketDraft: BracketDraft;
  isParallelParent: boolean;
  isPublishedTournament: boolean;
  rulesExpanded: boolean;
  onPatchDraft: (patch: BracketPatch) => void;
  onPersistTournamentPatch: (patch: BracketPatch) => void;
  onToggleRules: () => void;
};

export type DraftPoolProps = {
  bracketDraft: BracketDraft;
  pools: BracketPoolOption[];
  linkedPool: ManagedPool | null | undefined;
  trimmedBracketTitle: string;
  hasSourcePool: boolean;
  isPublishedTournament: boolean;
  isParallelParent: boolean;
  isManagingEntrants: boolean;
  isPoolMenuOpen: boolean;
  isActionPending: PendingTournamentAction;
  onPatchDraft: (patch: BracketPatch) => void;
  onPersistTournamentPatch: (patch: BracketPatch) => void;
  onToggleManageEntrants: (forceOpen?: boolean) => void;
  onTogglePoolMenu: () => void;
  onClosePoolMenu: () => void;
  onCreatePool: (input: { name: string; attachedTournamentId: string; switchToPools: boolean }) => Promise<BracketPoolOption | null | undefined>;
  onSyncWithPool: () => void;
  onOpenSeedingEditor: () => void;
};

export type DraftPoolControlsProps = {
  tournament: Bracket;
  pool: DraftPoolProps;
  onCreatePool: () => void;
  onSelectPool: (poolId: string) => void;
};

export type DraftEntrantsProps = {
  linkedPoolCandidates: PoolCandidate[];
  candidateDraft: CandidateDraft;
  isCandidateEditorOpen: boolean;
  isEditingCandidate: boolean;
  imageSuggestions: ImageSuggestion[];
  imageSuggestionLoading: boolean;
  removingCandidateId: string | null;
  updateCandidateDraft: (poolId: string, field: keyof CandidateDraft, value: string) => void;
  openCandidateCreator: (poolId: string) => void;
  handleImportCandidatesIntoPool: (pool: BracketPoolOption) => void;
  handleCandidateEditSubmit: (poolId: string) => void;
  handleCreateCandidateInPool: (poolId: string) => void;
  closeCandidateEditor: (poolId: string) => void;
  handleSuggestImages: (poolId: string) => void;
  selectSuggestedImage: (poolId: string, imageUrl: string) => void;
  openCandidateEditor: (poolId: string, candidate: PoolCandidate) => void;
  handleRemoveCandidateFromPool: (poolId: string, candidate: PoolCandidate) => void;
};

export type DraftCandidateManagerProps = {
  poolId: string;
  linkedPool: ManagedPool | null | undefined;
  isPublishedTournament: boolean;
  entrants: DraftEntrantsProps;
  isActionPending: PendingTournamentAction;
};

export type DraftLobbyProps = {
  activeShareLink: BracketShareLink;
  invitees: BracketInvite[];
  isParallelParent: boolean;
  isCopyPending: boolean;
  onCopyShareLink: () => void;
};

export type DraftActionsProps = {
  canStartBracket: boolean;
  isActionPending: PendingTournamentAction;
  onStartTournament: () => void;
  onArchiveTournament: () => void;
};

export type ExpandedDraftTournamentSectionProps = {
  tournament: Bracket;
  settings: DraftSettingsProps;
  pool: DraftPoolProps;
  entrants: DraftEntrantsProps;
  lobby: DraftLobbyProps;
  actions: DraftActionsProps;
};

export type CollapsedDraftTournamentSectionProps = {
  tournament: Bracket;
  isPublishedTournament: boolean;
  canStartBracket: boolean;
  describeTournamentAudienceMode: BracketAudienceDescriber;
  formatBracketRuleLabel: BracketLabelFormatter;
  isActionPending: PendingTournamentAction;
  onEditDraft: (tournamentId: string) => void;
  onStartTournament: (tournamentId: string) => void;
};

export type ActiveParallelTournamentSectionProps = {
  tournament: Bracket;
  primaryActionHref: string;
  primaryActionLabel: string;
  activeShareLink: BracketShareLink;
  invitees: BracketInvite[];
  canCopyBracketLink: (bracket: Bracket) => boolean;
  describeTournamentAudienceMode: BracketAudienceDescriber;
  formatBracketRuleLabel: BracketLabelFormatter;
  isActionPending: PendingTournamentAction;
  onCopyShareLink: (tournamentId: string) => void;
  onCloseBracket: (tournamentId: string) => void;
  onArchiveTournament: (tournamentId: string, title: string) => void;
};

export type ActiveStandardTournamentSectionProps = {
  tournament: Bracket;
  activeRoundMatches: BracketMatch[];
  hasOpenVotes: boolean;
  activeRoundVoteGoal: number;
  creatorVotesCast: number;
  creatorIsDone: boolean;
  activeShareLink: BracketShareLink;
  invitees: BracketInvite[];
  canCopyBracketLink: (bracket: Bracket) => boolean;
  describeTournamentAudienceMode: BracketAudienceDescriber;
  formatBracketRuleLabel: BracketLabelFormatter;
  isActionPending: PendingTournamentAction;
  onCloseCurrentRound: (tournamentId: string) => void;
  onOpenNextRound: (tournamentId: string) => void;
  onCopyShareLink: (tournamentId: string) => void;
  onSetManualMatchWinner: (tournamentId: string, matchId: string, winnerEntryId: string | null) => void;
  onRerunTournament: (tournamentId: string) => void;
  onArchiveTournament: (tournamentId: string, title: string) => void;
};

export type ManualResultQueueProps = {
  tournament: Bracket;
  matches: BracketMatch[];
  isActionPending: PendingTournamentAction;
  onSetManualMatchWinner: (tournamentId: string, matchId: string, winnerId: string | null) => void;
};

export type CompletedTournamentSectionProps = {
  tournament: Bracket;
  hasSourcePool: boolean;
  formatBracketRuleLabel: BracketLabelFormatter;
  isActionPending: PendingTournamentAction;
  onRerunTournament: (tournamentId: string) => void;
  onArchiveTournament: (tournamentId: string, title: string) => void;
};
