/** Inputs for an offset-paginated request. */
export type PaginationOptions<Value extends number | string = number> = {
  limit?: Value | null;
  offset?: Value;
};

/** Inputs for offset pagination encoded with a resource prefix, such as candidateLimit. */
export type PrefixedPaginationOptions<Prefix extends string, Value extends number | string = number> = {
  [Key in `${Prefix}Limit`]?: Value | null;
} & {
  [Key in `${Prefix}Offset`]?: Value;
};

/** Metadata for an offset-paginated result page. */
export type Pagination = PaginationOptions & {
  hasNextPage?: boolean;
};
