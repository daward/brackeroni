let candidateSchemaSupportPromise = null;

export async function getCandidateSchemaSupport(sql) {
  if (!candidateSchemaSupportPromise) {
    candidateSchemaSupportPromise = (async () => {
      const [row] = await sql`
        select
          bool_or(column_name = 'tags') as "hasTags",
          bool_or(column_name = 'source_url') as "hasSourceUrl"
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'candidate'
          and column_name in ('tags', 'source_url')
      `;

      return {
        hasTags: Boolean(row?.hasTags),
        hasSourceUrl: Boolean(row?.hasSourceUrl)
      };
    })();
  }

  return candidateSchemaSupportPromise;
}
