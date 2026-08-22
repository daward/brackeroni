export type BracketStatus = "draft" | "active" | "complete";
export type BracketVisibility = "private" | "public_listed" | "public_unlisted";
export type BracketSharingMode = "private" | "with_friends";
export type BracketAudienceMode = BracketVisibility | "with_friends";

/** The common record shape rendered by managed-bracket workspace surfaces. */
export type ManagedBracket = {
  id: string;
  title: string;
  status: BracketStatus;
  createdAt: string | Date;
  kind?: "standard" | "parallel_parent";
  visibility?: BracketVisibility;
  sharingMode?: BracketSharingMode;
  resultMode?: string | null;
  playStyle?: string | null;
  candidateCount?: number | null;
  entryCount?: number | null;
  activeRoundNumber?: number | null;
  activeRoundOpenMatchCount?: number | null;
  openVoteCount?: number | null;
  winnerEntryId?: string | null;
  winnerName?: string | null;
  winnerSeed?: number | null;
  winnerImageUrl?: string | null;
};

export type ParallelBracketSource = Omit<Partial<ManagedBracket>, "id" | "title" | "status" | "createdAt"> & {
  id: string;
  title: string;
  status: BracketStatus;
  createdAt: string | Date;
  candidateCount?: number | null;
};
