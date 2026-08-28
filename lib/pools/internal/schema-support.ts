export type PoolSql = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<any[]>;
  (values: unknown[]): unknown;
};

export type PoolSqlClient = PoolSql & {
  begin<T>(callback: (tx: PoolSql) => Promise<T>): Promise<T>;
};

export type PoolVisibilitySupport = {
  hasVisibility: boolean;
  hasPublishedAt: boolean;
  hasSourcePoolId: boolean;
  hasFeaturedOnHome: boolean;
  hasImportSourceUrl: boolean;
  hasImportSourceTitle: boolean;
  hasEnrichmentCursorDisplayOrder: boolean;
};

let poolVisibilitySupportPromise: Promise<PoolVisibilitySupport> | null;

export async function getPoolVisibilitySupport(sql: PoolSql): Promise<PoolVisibilitySupport> {
  if (!poolVisibilitySupportPromise) {
    poolVisibilitySupportPromise = (async () => {
      const [row] = await sql`
        select
          bool_or(column_name = 'visibility') as "hasVisibility",
          bool_or(column_name = 'published_at') as "hasPublishedAt",
          bool_or(column_name = 'source_pool_id') as "hasSourcePoolId",
          bool_or(column_name = 'featured_on_home') as "hasFeaturedOnHome",
          bool_or(column_name = 'import_source_url') as "hasImportSourceUrl",
          bool_or(column_name = 'import_source_title') as "hasImportSourceTitle",
          bool_or(column_name = 'enrichment_cursor_display_order') as "hasEnrichmentCursorDisplayOrder"
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'candidate_pool'
          and column_name in (
            'visibility',
            'published_at',
            'source_pool_id',
            'featured_on_home',
            'import_source_url',
            'import_source_title',
            'enrichment_cursor_display_order'
          )
      `;

      return {
        hasVisibility: Boolean(row?.hasVisibility),
        hasPublishedAt: Boolean(row?.hasPublishedAt),
        hasSourcePoolId: Boolean(row?.hasSourcePoolId),
        hasFeaturedOnHome: Boolean(row?.hasFeaturedOnHome),
        hasImportSourceUrl: Boolean(row?.hasImportSourceUrl),
        hasImportSourceTitle: Boolean(row?.hasImportSourceTitle),
        hasEnrichmentCursorDisplayOrder: Boolean(row?.hasEnrichmentCursorDisplayOrder)
      };
    })().catch((error) => {
      poolVisibilitySupportPromise = null;
      throw error;
    });
  }

  return poolVisibilitySupportPromise;
}
