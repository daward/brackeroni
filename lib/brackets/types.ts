import type { PoolCandidate } from "@/lib/pools/types";

export type BracketStatus = "draft" | "active" | "complete";
export type BracketVisibility = "private" | "public_listed" | "public_unlisted";
export type BracketSharingMode = "private" | "with_friends";
export type BracketAudienceMode = BracketVisibility | "with_friends";
export type BracketPlayStyle = "fixed_bracket" | "reseed";
export type BracketResultMode =
  | "winner_only"
  | "full_ranking"
  | "partial_ranking"
  | "fast_full_rank"
  | "parallel_full_ranking"
  | "parallel_partial_ranking";
export type BracketAdvancementMode = "vote_winner" | "manual_winner";
export type BracketTieBreakMode = "higher_seed_wins" | "random";

export type BracketAccess = {
  sharingMode?: BracketSharingMode;
  visibility?: BracketVisibility;
  votingAccess?: string | null;
};

export type BracketRules = {
  playStyle: BracketPlayStyle;
  resultMode: BracketResultMode;
  tieBreakMode: BracketTieBreakMode;
  advancementMode?: BracketAdvancementMode | null;
};

/** Fields edited while a creator configures a draft bracket. */
export type BracketDraft = BracketAccess &
  BracketRules & {
    title: string;
    sourcePoolId: string;
  };

/** Draft bracket projection used while configuring an existing tournament draft. */
export type BracketSetupDraft = Omit<
  {
    [Field in keyof BracketDraft]?: BracketDraft[Field] | null;
  },
  "sourcePoolId" | "title"
> & {
  id: string;
  title: string;
  sourcePoolId?: string | null;
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

export type BracketKind = "standard" | "parallel_parent";

export type BracketCandidate = Pick<PoolCandidate, "id" | "name" | "description" | "imageUrl">;

export type BracketTimestamps = {
  completedAt?: string | Date | null;
  archivedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  startedAt?: string | Date | null;
};

/** Stable identity and lifecycle fields shared by bracket records. */
export type BracketIdentity = {
  id: string;
  title: string;
  status: BracketStatus;
  createdAt: string | Date;
  kind?: BracketKind;
};

/** Configuration fields a creator can inspect or edit while managing a bracket. */
export type BracketConfiguration = BracketAccess & {
  resultMode?: BracketResultMode | string | null;
  playStyle?: BracketPlayStyle | string | null;
  advancementMode?: BracketAdvancementMode | null;
  tieBreakMode?: BracketTieBreakMode | string | null;
};

/** Source and size fields used when summarizing bracket setup. */
export type BracketSource = {
  sourcePoolId?: string | null;
  sourcePoolName?: string | null;
  candidateCount?: number | null;
  entryCount?: number | null;
};

/** Active round progress fields used by live standard brackets. */
export type BracketRoundProgress = {
  activeRoundNumber?: number | null;
  activeRoundOpenMatchCount?: number | null;
  openVoteCount?: number | null;
};

/** Winner projection shown by completed and preview surfaces. */
export type BracketWinner = {
  winnerEntryId?: string | null;
  winnerName?: string | null;
  winnerSeed?: number | null;
  winnerImageUrl?: string | null;
};

/** Aggregate participant progress fields for parallel brackets. */
export type ParallelBracketProgress = {
  completedParticipantCount?: number | null;
  participantCount?: number | null;
  viewerParticipantStatus?: string | null;
  viewerTournamentId?: string | null;
};

/** Visibility hints that affect what management and public surfaces reveal. */
export type BracketVisibilityState = {
  hasHiddenClosedRounds?: boolean;
};

/** The common flat record shape rendered by bracket workspace surfaces. */
export type Bracket = BracketIdentity &
  BracketConfiguration &
  BracketSource &
  BracketRoundProgress &
  BracketWinner &
  ParallelBracketProgress &
  BracketVisibilityState;

export type ParallelBracketSource = BracketIdentity & Omit<Partial<Bracket>, keyof BracketIdentity>;

export type BracketMutationOk = {
  ok: boolean;
};

export type BracketLifecyclePatch = {
  closeCurrentRound?: boolean;
  openNextRound?: boolean;
};

export type BracketOwnerHandleOptions = {
  creatorUserId: string;
};

export type BracketOwnerHandle = {
  update(patch: Partial<BracketDraft> & Record<string, unknown>): Promise<Bracket>;
  archive(): Promise<BracketMutationOk>;
  listShareLinks(): Promise<Array<Record<string, unknown>>>;
  ensureShareLink(): Promise<Record<string, unknown>>;
  rotateShareLink(): Promise<Record<string, unknown>>;
};

export type BracketHandleOptions = BracketOwnerHandleOptions & {
  tournamentId: string;
};

export type BracketHandle = BracketOwnerHandle & {
  get(): Promise<Bracket>;
  createRerun(): Promise<Bracket>;
  updateEntries(options: { entries: SeedingPayloadEntry[]; seedingStructure?: SeedingStructure }): Promise<Bracket>;
  closeCurrentRound(): Promise<unknown>;
  openNextRound(): Promise<unknown>;
  applyLifecyclePatch(patch: BracketLifecyclePatch): Promise<void>;
  listInvites(): Promise<BracketInvite[]>;
};

export type BracketCreateInput = BracketAccess &
  BracketRules & {
    title: string;
    description?: string | null;
    sourcePoolId?: string | null;
    seedCandidateIds?: string[];
  };

export type BracketListOptions = {
  status?: BracketStatus | null;
  limit?: number;
  offset?: number;
};

export type BracketList = {
  items: Bracket[];
  hasNextPage: boolean;
};

export type BracketCollectionOptions = {
  creatorUserId: string;
};

export type BracketCollection = {
  list(options?: BracketListOptions): Promise<BracketList>;
  statusCounts(): Promise<Partial<Record<BracketStatus, number>>>;
  create(input: BracketCreateInput): Promise<Bracket>;
};

export type BracketAccessibleOptions = {
  tournamentId: string;
  userId?: string | null;
  anonymousVoterToken?: string | null;
};

export type BracketAccessibleListOptions = {
  userId: string;
  statuses?: BracketStatus[] | null;
  limit?: number;
  offset?: number;
};

export type BracketPublicListOptions = {
  statuses?: BracketStatus[];
  limit?: number;
  offset?: number;
};

export type BracketFeaturedOptions = {
  limit?: number;
};

export type BracketShareTokenOptions = {
  token: string;
  userId?: string | null;
};

export type ParallelBracketHandleOptions = BracketOwnerHandleOptions & {
  parallelBracketId: string;
};

export type ParallelBracketCreateInput = BracketAccess & {
  title: string;
  description?: string | null;
  sourcePoolId: string;
  resultMode: Extract<BracketResultMode, "parallel_full_ranking" | "parallel_partial_ranking">;
  tieBreakMode: BracketTieBreakMode;
};

export type ParallelBracketListOptions = BracketListOptions;

export type ParallelBracketCollection = {
  list(options?: ParallelBracketListOptions): Promise<BracketList>;
  statusCounts(): Promise<Partial<Record<BracketStatus, number>>>;
  create(input: ParallelBracketCreateInput): Promise<Bracket>;
};

export type ParallelBracketAccessibleOptions = {
  parallelBracketId: string;
  userId?: string | null;
  anonymousVoterToken?: string | null;
};

export type ParallelBracketAccessibleListOptions = BracketAccessibleListOptions & {
  anonymousVoterToken?: string | null;
};

export type ParallelBracketPublicListOptions = BracketPublicListOptions;

export type ParallelParticipantOpenOptions = ParallelBracketAccessibleOptions;

export type ParallelBracketDirectory = {
  getAccessibleBracketById(options: ParallelBracketAccessibleOptions): Promise<Bracket>;
  getFeaturedTeaserMatchups(options?: BracketFeaturedOptions): Promise<Array<Record<string, unknown>>>;
  getAggregateResults(options: ParallelBracketAccessibleOptions): Promise<Record<string, unknown>>;
  listAccessibleBrackets(options: ParallelBracketAccessibleListOptions): Promise<Bracket[]>;
  listPublicBrackets(options?: ParallelBracketPublicListOptions): Promise<Bracket[]>;
  openParticipantBracket(options: ParallelParticipantOpenOptions): Promise<{ tournamentId: string }>;
  canInspectAllParticipants(options: Pick<BracketAccess, "sharingMode" | "visibility">): boolean;
  filterVisibleParticipants<T extends { userId?: string | null; anonymousVoterToken?: string | null }>(options: {
    participants: T[];
    userId?: string | null;
    anonymousVoterToken?: string | null;
    canInspectAllParticipants?: boolean;
  }): T[];
};

export type BracketDirectory = {
  getAccessibleTournamentById(options: BracketAccessibleOptions): Promise<Bracket>;
  getFeaturedPublicMatchups(options?: BracketFeaturedOptions): Promise<Array<Record<string, unknown>>>;
  getFeaturedPublicMatchupsForHomepage(options?: BracketFeaturedOptions): Promise<Array<Record<string, unknown>>>;
  getTournamentByShareToken(options: BracketShareTokenOptions): Promise<Record<string, unknown>>;
  listAccessibleTournaments(options: BracketAccessibleListOptions): Promise<Bracket[]>;
  listPublicTournaments(options?: BracketPublicListOptions): Promise<Bracket[]>;
};


export type BracketTemplateLibrary = {
  list(): Promise<BracketTemplateCollection>;
  create(input: BracketTemplateInput): Promise<BracketTemplate>;
  update(patch: BracketTemplatePatch): Promise<BracketTemplate | null>;
};

export type BracketTemplateSlot = {
  id?: string;
  seed: number;
  subSeed?: number | null;
  tag?: string | null;
  templateSlot: number;
};

export type BracketTemplateSubBracket = {
  id?: string;
  name: string;
  tag?: string | null;
  slotCount: number;
  feedOrder: number;
  displayOrder: number;
  slots: BracketTemplateSlot[];
};

export type BracketTemplateCollection = {
  builtIn: BracketTemplate[];
  user: BracketTemplate[];
};

export type BracketTemplate = BracketTemplateInput & {
  id: string;
  builtInKey?: string | null;
  isBuiltIn: boolean;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export type BracketTemplateInput = {
  name: string;
  description?: string | null;
  subBrackets: BracketTemplateSubBracket[];
};

export type BracketTemplatePatch = BracketTemplateInput & {
  templateId: string;
  archive?: boolean;
};

export type BracketTemplateLibraryOptions = {
  userId: string;
};

/** Canonical records persisted by the bracket seeding editor. */
export type SeedingEntryRecord = {
  id: string;
  seed: number;
  subSeed?: number | null;
  finalRank?: number | null;
  candidate?: BracketCandidate | null;
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
