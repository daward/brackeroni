/** Domain records shared by pool features, independent of any UI package. */
export type PoolVisibility = "private" | "public_listed" | "public_unlisted";

/** A candidate belonging to a pool. Feature packages may add presentation state around it. */
export type PoolCandidate = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
};

/** A pool record used by editing and management features. */
export type ManagedPool = {
  id?: string;
  name: string;
  description?: string | null;
  visibility?: PoolVisibility;
  candidateCount: number;
  importSourceUrl?: string | null;
};

/** Mutable pool fields shared by pool creation and editing flows. */
export type PoolDraft = {
  name: string;
  description: string;
  visibility: PoolVisibility;
};

/** Pagination metadata returned with a pool candidate collection. */
export type PoolCandidatePagination = {
  hasNextPage?: boolean;
};

/** A complete pool record returned by the detail endpoint. */
export type PoolDetail = ManagedPool & {
  id: string;
  importSourceTitle?: string | null;
  isReadOnly?: boolean;
  candidates: PoolCandidate[];
  candidatePagination?: PoolCandidatePagination | null;
};

/** A published pool returned by listing and discovery queries. */
export type PublicPool = {
  id: string;
  name: string;
  description?: string | null;
  candidateCount: number;
  creatorName?: string | null;
  creatorEmail?: string | null;
  previewCandidates?: PoolCandidate[];
  isFavorited?: boolean;
  favoritePoolId?: string | null;
};
