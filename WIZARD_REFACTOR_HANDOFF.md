# Bracket creation wizard handoff

## Current state

The active workspace is `C:\code\brackeroni`. Preserve the existing dirty
worktree: it contains unrelated management, service, and prior configuration
refactor changes.

`components/brackets/configuration/internal/bracket-creation-wizard.js` has
been migrated to `bracket-creation-wizard.tsx`. It is typechecked and is now
roughly 467 lines, but it is still too large because it renders all six wizard
steps and the page shell.

These extractions are complete and are used by the controller:

- `wizard-local-pool-builder.tsx` owns draft-pool candidate editing, import,
  and image suggestions.
- `wizard-choice-controls.tsx` owns `VersusChoice`, `ChoiceCards`,
  `WizardQuestion`, `ReviewItem`, and result-mode choice controls.
- `wizard-result-modes.tsx` owns typed result-mode presentation data.

The wizard's public contract is `BracketCreationWizardProps` in
`components/brackets/configuration/types.ts`. Its input contract has a nullable
`seedCandidateIds` field because pool-order seeding does not supply a custom
seed list.

## Required next work

Complete the extraction rather than reporting incremental progress:

1. Create `wizard-layout.tsx` for the header, step navigation, page canvas,
   footer, and step dispatch.
2. Split the six individual step views into focused typed components (at least
   source selection, configuration/matchups, seeding, and review/access).
3. Leave `bracket-creation-wizard.tsx` as a typed controller: state, loading
   pools/candidates, validation, custom-seed ordering, submission, and a single
   layout invocation. It should not contain the large JSX step bodies.
4. Give each child only narrow props; do not pass the entire controller.
5. Keep all source lines at or under 180 characters except rare, unavoidable
   literal values. Run Prettier after each extraction.

## Constraints

- Read `design/lookandfeel.md` before editing user-facing UI.
- Follow `reference-implementation.md`: real `.ts`/`.tsx` implementation,
  explicit public contracts, one independently reusable component per file, no
  JavaScript compatibility wrappers, and no `any` in feature public types.
- Multi-step workflows remain real pages using the existing canvas/navigation
  pattern. Do not turn the route into a modal; use destination-aware navigation.
- Use `apply_patch` for source changes.

## Verification state

Passed after the current extraction:

- `npm.cmd run typecheck`
- `npm.cmd run format:check`
- `git diff --check`

`npm.cmd test` previously reached the migrated Vitest seeding tests and exposed
one failing assertion in `test/seeding-entry-logic.test.ts`: the test expected a
canonical payload entry for a real entry adjacent to an empty slot, while the
current policy returned an empty payload. That failure predates this wizard-only
extraction and should be resolved or explicitly characterized before claiming
the full suite passes.
