"use client";

import { CandidateManagerPanel } from "./candidate-manager-panel";
import { usePaginatedCandidates } from "./use-paginated-candidates";
import type { CandidateManagerProps, CandidatePaginationSource } from "../types";

type Props = CandidateManagerProps & { source: CandidatePaginationSource };

export function PaginatedCandidateManagerPanel({ source, editor, actions, tagManagement, view }: Props) {
  const collection = usePaginatedCandidates(source);

  return <CandidateManagerPanel collection={collection} editor={editor} actions={actions} tagManagement={tagManagement} view={view} />;
}
