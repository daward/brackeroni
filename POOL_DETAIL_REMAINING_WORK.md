# Pool detail refactor status

There is no technical blocker. The remaining work is incomplete because the
previous implementation attempt repeatedly stopped before moving the action
block out of `use-pool-detail.ts`.

## Remaining work

1. Extract the pool-level action block from
   `components/pools/detail/internal/use-pool-detail.ts` into a focused private
   hook. This includes:
   - tag removal and low-value tag removal;
   - enrichment from source links;
   - copying the pool link and continuing an import;
   - loading merge candidates and merging a pool;
   - filling missing candidate images; and
   - archiving a pool.
2. Remove the unused API imports and local response types from
   `use-pool-detail.ts` after that extraction.
3. Reformat and finish the CSS/readability audit for
   `components/pools/detail/internal/pool-detail-actions.tsx`.
4. Verify with:
   - `npm.cmd run typecheck`
   - `npm.cmd run test:ui`
   - `npm.cmd run build`
   - `git diff --check`

## Already completed and verified

- Detail public entry point and public-boundary test.
- Kebab-menu interaction tests, including the published-pool disabled-action
  regression.
- Candidate editor-state extraction.
- Detail status/toast-state extraction.
- Candidate image-suggestion extraction.
- `PoolManagementPanel` presentation props grouped by concern.

The completed TypeScript checks and UI tests passed after these changes. The
full production build has not yet been rerun after the most recent changes.
