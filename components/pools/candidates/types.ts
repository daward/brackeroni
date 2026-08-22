/**
 * Public contract for the candidate feature.
 *
 * Hosts own domain data and mutations; the candidate manager owns list, drawer,
 * filtering, and pagination presentation. Import these types from the feature
 * entry point rather than from this file's path.
 */

import type { PoolCandidate } from "@/lib/pools/types";
export type { PoolCandidate } from "@/lib/pools/types";

/**
 * The list data supplied by a host. Static collections use `null` for
 * `loadMore`; paginated collections provide the callback.
 */
export type CandidateCollection = {
  candidates: PoolCandidate[];
  hasNextPage: boolean;
  isLoadingMore: boolean;
  loadMore: (() => void) | null;
};

/** Mutable field values for the create/edit drawer. */
export type CandidateDraft = {
  name: string;
  description: string;
  imageUrl: string;
  tagsText: string;
};

/** A selectable image returned by the host's image-search integration. */
export type ImageSuggestion = {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title?: string;
};

/**
 * State and callbacks for the editor drawer. The host persists changes; the
 * feature renders the form and routes user input through these callbacks.
 */
export type CandidateEditor = {
  isOpen: boolean;
  isEditing: boolean;
  draft: CandidateDraft;
  imageSuggestions: ImageSuggestion[];
  imageSuggestionLoading: boolean;
  isCreatePending?: boolean;
  isSavePending?: boolean;
  description?: string;
  onDraftChange: (field: keyof CandidateDraft, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onSuggestImages: () => void;
  onClearImage: () => void;
  onSelectSuggestedImage: (imageUrl: string) => void;
};

/** Candidate-level mutations supplied by the host. */
export type CandidateActions = {
  onCreate: () => void;
  onImport?: () => void;
  onEdit: (candidate: PoolCandidate) => void;
  onRemove: (candidate: PoolCandidate) => void;
  removingCandidateId?: string | null;
};

/**
 * Tag drawer configuration. The request flags let a host open the drawer from
 * elsewhere (for example, a page header menu) without reaching into its state.
 */
export type CandidateTagManagement = {
  showControl: boolean;
  openDrawerRequest?: boolean;
  onDrawerRequestHandled?: () => void;
  isRemoveTagPending?: (tag: string) => boolean;
  isRemoveLowValueTagsPending?: (threshold: number) => boolean;
  onRemoveTag?: (tag: string) => void;
  onRemoveLowValueTags?: (threshold: number) => void;
};

/** Presentation choices for a particular candidate-manager placement. */
export type CandidateManagerView = {
  readOnly?: boolean;
  showTopRule?: boolean;
  listHeading?: string | null;
  listEmptyMessage?: string;
};

/** The complete public input contract for `CandidateManagerPanel`. */
export type CandidateManagerProps = {
  collection: CandidateCollection;
  editor: CandidateEditor;
  actions: CandidateActions;
  tagManagement: CandidateTagManagement;
  view: CandidateManagerView;
};

/**
 * Source data for `PaginatedCandidateManagerPanel`; the adapter turns it into a
 * `CandidateCollection` while retaining the same manager contract.
 */
export type CandidatePaginationSource = {
  poolId: string;
  candidates: PoolCandidate[];
  pagination?: { hasNextPage?: boolean } | null;
};
