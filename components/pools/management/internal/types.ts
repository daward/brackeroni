import type { Pagination } from "@/lib/pagination/types";
import type { PoolVisibility } from "@/lib/pools/types";

export type OwnedPoolSummary = {
  id: string;
  name: string;
  description?: string | null;
  visibility?: PoolVisibility;
  candidateCount: number;
};

export type PoolPagination = Pagination & {
  page: number;
  pageSize: number;
  totalCount: number;
};
