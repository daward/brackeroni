// @ts-nocheck
let parallelTournamentSchemaSupportPromise = null;

export async function getParallelTournamentSchemaSupport(sql) {
  if (!parallelTournamentSchemaSupportPromise) {
    parallelTournamentSchemaSupportPromise = (async () => {
      const [row] = await sql`
        select
          exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'tournament'
              and column_name = 'parent_parallel_tournament_id'
          ) as "hasParentParallelTournamentId",
          exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'tournament'
              and column_name = 'intent_preset'
          ) as "hasTournamentIntentPreset",
          exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'parallel_tournament'
              and column_name = 'intent_preset'
          ) as "hasParallelTournamentIntentPreset",
          exists (
            select 1
            from information_schema.tables
            where table_schema = 'public'
              and table_name = 'parallel_tournament_participant'
          ) as "hasParallelTournamentParticipantTable"
      `;

      return {
        hasParentParallelTournamentId: Boolean(row?.hasParentParallelTournamentId),
        hasTournamentIntentPreset: Boolean(row?.hasTournamentIntentPreset),
        hasParallelTournamentIntentPreset: Boolean(row?.hasParallelTournamentIntentPreset),
        hasParallelTournamentParticipantTable: Boolean(
          row?.hasParallelTournamentParticipantTable
        )
      };
    })().catch((error) => {
      parallelTournamentSchemaSupportPromise = null;
      throw error;
    });
  }

  return parallelTournamentSchemaSupportPromise;
}
