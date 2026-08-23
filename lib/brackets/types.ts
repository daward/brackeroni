export type BracketStatus = "draft" | "active" | "complete";
export type BracketVisibility = "private" | "public_listed" | "public_unlisted";
export type BracketSharingMode = "private" | "with_friends";
export type BracketAudienceMode = BracketVisibility | "with_friends";
export type BracketPlayStyle = "fixed_bracket" | "reseed";
export type BracketResultMode = "winner_only" | "full_ranking" | "partial_ranking" | "fast_full_rank" | "parallel_full_ranking" | "parallel_partial_ranking";
export type BracketAdvancementMode = "vote_winner" | "manual_winner";
export type BracketTieBreakMode = "higher_seed_wins" | "random";

/** Fields edited while a creator configures a draft bracket. */
export type BracketDraft = {
  title: string;
  sourcePoolId: string;
  sharingMode?: BracketSharingMode;
  visibility?: BracketVisibility;
  votingAccess?: string | null;
  playStyle: BracketPlayStyle;
  resultMode: BracketResultMode;
  tieBreakMode: BracketTieBreakMode;
  advancementMode?: BracketAdvancementMode | null;
};

/** Draft bracket projection used while configuring an existing tournament draft. */
export type BracketSetupDraft = {
  id: string;
  title: string;
  sourcePoolId?: string | null;
  playStyle?: BracketPlayStyle | null;
  resultMode?: BracketResultMode | null;
  advancementMode?: BracketAdvancementMode | null;
  tieBreakMode?: BracketTieBreakMode | null;
  visibility?: BracketVisibility | null;
  sharingMode?: BracketSharingMode | null;
};

/** A participant's visible progress in a managed bracket. */
export type BracketInvite = {
  id: string;
  name?: string | null;
  email?: string | null;
  status?: string | null;
  openMatchCount?: number | null;
  votesCast?: number | null;
};

/** A matchup rendered while a creator records manual results. */
export type BracketMatch = {
  id: string;
  status: string;
  leftEntryId: string;
  rightEntryId: string;
  leftName: string;
  rightName: string;
  leftSeed: number;
  rightSeed: number;
  leftVoteCount?: number | null;
  rightVoteCount?: number | null;
  winnerEntryId?: string | null;
};

/** The common record shape rendered by managed-bracket workspace surfaces. */
export type ManagedBracket = {
  id: string;
  title: string;
  status: BracketStatus;
  createdAt: string | Date;
  kind?: "standard" | "parallel_parent";
  visibility?: BracketVisibility;
  sharingMode?: BracketSharingMode;
  resultMode?: BracketResultMode | string | null;
  playStyle?: BracketPlayStyle | string | null;
  candidateCount?: number | null;
  entryCount?: number | null;
  activeRoundNumber?: number | null;
  activeRoundOpenMatchCount?: number | null;
  openVoteCount?: number | null;
  winnerEntryId?: string | null;
  winnerName?: string | null;
  winnerSeed?: number | null;
  winnerImageUrl?: string | null;
  advancementMode?: BracketAdvancementMode | null;
  completedParticipantCount?: number | null;
  hasHiddenClosedRounds?: boolean;
  participantCount?: number | null;
  sourcePoolId?: string | null;
  sourcePoolName?: string | null;
  tieBreakMode?: BracketTieBreakMode | string | null;
  viewerParticipantStatus?: string | null;
  viewerTournamentId?: string | null;
  votingAccess?: string | null;
};

export type ParallelBracketSource = Omit<Partial<ManagedBracket>, "id" | "title" | "status" | "createdAt"> & {
  id: string;
  title: string;
  status: BracketStatus;
  createdAt: string | Date;
  candidateCount?: number | null;
};

/** Canonical records persisted by the bracket seeding editor. */
export type SeedingEntryRecord = {
  id: string;
  seed: number;
  subSeed?: number | null;
  finalRank?: number | null;
  candidateId?: string | null;
  candidateName?: string | null;
  candidateDescription?: string | null;
  candidateImageUrl?: string | null;
  isEmptySlot?: boolean;
};

export type SeedingSubBracket = {
  id: string;
  index: number;
  name: string;
};

export type SeedingStructure = {
  subBrackets: SeedingSubBracket[];
  entryBrackets: Record<string, string>;
};

export type SeedingPayloadEntry = {
  id: string;
  seed: number;
  subSeed: number;
};

export type SeedingValidation = {
  isValidForSave: boolean;
  hasEmptySlot: boolean;
  issues: string[];
};
