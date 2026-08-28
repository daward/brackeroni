/** Metadata for an offset-paginated result page. */
export type Pagination = {
  limit?: number | null;
  offset?: number;
  hasNextPage?: boolean;
};
