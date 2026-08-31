/** Domain records shared by pool features, independent of any UI package. */
import type { Pagination, PrefixedPaginationOptions } from "@/lib/pagination/types";

export type PoolVisibility = "private" | "public_listed" | "public_unlisted";

/** Candidate fields accepted by pool creation/import/mutation workflows. */
export type PoolCandidateInput = {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
};

/** A candidate belonging to a pool. Feature packages may add presentation state around it. */
export type PoolCandidate = PoolCandidateInput & {
  id: string;
  displayOrder?: number | null;
};

export type PoolCandidatePatch = Partial<PoolCandidateInput>;

/** A pool record used by editing and management features. */
export type ManagedPool = {
  id?: string;
  name: string;
  description?: string | null;
  visibility?: PoolVisibility;
  candidateCount: number;
  importSourceUrl?: string | null;
  importSourceTitle?: string | null;
  creatorUserId?: string;
  enrichmentCursorDisplayOrder?: number | null;
  publishedAt?: string | Date | null;
  archivedAt?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  isOwned?: boolean;
  isReadOnly?: boolean;
};

/** A pool summary suitable for choosing a pool in another feature. */
export type PoolSelectionOption = {
  id: string;
  name: string;
  candidateCount?: number | null;
  description?: string | null;
};

/** Mutable pool fields shared by pool creation and editing flows. */
export type PoolDraft = {
  name: string;
  description: string;
  visibility: PoolVisibility;
};

/** A complete pool record returned by the detail endpoint. */
export type PoolDetail = ManagedPool & {
  id: string;
  candidates: PoolCandidate[];
  candidatePagination?: Pagination | null;
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

export type PoolMutationOk = {
  ok: true;
};

export type PoolHandleOptions = {
  poolId: string;
  viewerUserId: string | null;
  isAdmin?: boolean;
};

export type PoolCandidatePageOptions = PrefixedPaginationOptions<"candidate">;

export type PoolCandidateImportResult = {
  pool: PoolDetail;
  importedCount: number;
  skippedCount: number;
  importedNames: string[];
  skippedNames: string[];
};

export type PoolCandidateEnrichmentResult = {
  pool: PoolDetail;
  processedCount?: number;
  enrichedCount: number;
  skippedCount: number;
  failedCount: number;
  remainingCount?: number;
};

export type PoolTagCleanupResult = {
  pool: PoolDetail;
  removedTags: string[];
};

export type PoolCandidateHandle = {
  update(patch: PoolCandidatePatch): Promise<PoolCandidate>;
  remove(): Promise<PoolMutationOk>;
};

export type PoolHandle = {
  get(options?: PoolCandidatePageOptions): Promise<PoolDetail>;
  update(patch: Partial<Pick<PoolDetail, "name" | "description" | "visibility">>): Promise<PoolDetail>;
  archive(): Promise<PoolMutationOk>;
  favorite(): Promise<PoolDetail>;
  mergeFromPool(options: { sourcePoolId: string }): Promise<PoolDetail>;
  importCandidates(options: { candidates: Partial<PoolCandidateInput>[] }): Promise<PoolCandidateImportResult>;
  addCandidates(options: { candidateIds: string[] }): Promise<PoolDetail>;
  createCandidate(candidate: PoolCandidateInput): Promise<PoolDetail>;
  candidate(candidateId: string): PoolCandidateHandle;
  removeTagFromCandidates(options: { tag: string }): Promise<PoolDetail>;
  removeLowValueTagsFromCandidates(options: { maxCandidateCount: number | string }): Promise<PoolTagCleanupResult>;
  enrichCandidatesFromSourceUrls(): Promise<PoolCandidateEnrichmentResult>;
};
