# Application architecture plan

This is a deferred architecture plan for treating Brackets and Pools as narrow
application surfaces rather than loose collections of feature modules. Keep
using `reference-implementation.md` for the current feature-level cleanup work;
this document describes the larger application-boundary pass to do after the
workspace and nearby UI structure are cleaner.

## Direction

Brackets and Pools should behave like separate applications inside the product.
External code should not need to understand their internal feature breakdowns.
Routes, tests, and unrelated areas should import from a narrow application root:

```ts
import { NewBracketSetupPage } from "@/components/brackets";
import { PoolDetailWorkspace } from "@/components/pools";
```

## Current Brackets Boundary

`components/brackets` now has an application root:

```text
components/brackets/
  index.ts
  types.ts
  configuration/
  join/
  management/
  progress/
  results/
  shared/
  voting/
```

Runtime code outside `components/brackets` must import bracket UI from
`@/components/brackets`. The route-level public surface is:

```ts
BracketManagementWorkspace;
NewBracketSetupPage;
BracketJoinPage;
BracketVotingPage;
BracketOutcomeNav;
BracketProgressPage;
ParallelResultsPage;
ResultsLinkedViewSelect;
TournamentResultsPage;
TournamentScoringPage;
```

The root also exports intentionally reusable bracket presentation pieces:

```ts
CompletedBracketCard;
TournamentPublishWarning;
```

`test/brackets-app-public-boundary.test.mjs` enforces that runtime code in
`app`, `components` outside brackets, and `lib` does not import bracket
subfeatures directly. Bracket subfeatures may still import each other through
their feature roots while they remain sibling folders.

Avoid external imports that couple callers to sub-feature folders:

```ts
import { BracketCreationWizard } from "@/components/brackets/configuration";
import { CandidateManagerPanel } from "@/components/pools/candidates";
```

The sub-feature boundaries are still useful, but they should become internal
organization inside the owning application.

## Target shape

Use this shape when the application-level boundary is ready to migrate:

```text
components/brackets/
  index.ts
  types.ts
  internal/
    configuration/
    management/
    progress/
    shared/

components/pools/
  index.ts
  types.ts
  internal/
    candidates/
    detail/
    shared/
```

`components/brackets/index.ts` and `components/pools/index.ts` are the public UI
surfaces for their applications. Their `types.ts` files contain public contracts
that external callers need. Implementation components, private hooks, internal
barrels, and private styles live below `internal/`.

## Public surface policy

Export only application entry points and intentionally shared controls from the
application root. If a component is useful only within Pools, keep it under
`components/pools/internal`. If a component is useful across applications,
either promote it to `components/shared` or export it deliberately from
`components/pools`.

The same applies to Brackets. Shared bracket implementation belongs inside
`components/brackets/internal/shared`; globally reusable primitives belong in
`components/shared`.

Do not export internals only to make a nearby import convenient. A public export
means the application agrees to support that contract.

## Boundary tests

Add boundary tests for both application roots:

1. `components/brackets` root contains only `index.ts`, `types.ts`, and
   `internal/`.
2. `components/pools` root contains only `index.ts`, `types.ts`, and
   `internal/`.
3. No source outside `components/brackets` imports from
   `components/brackets/internal`.
4. No source outside `components/pools` imports from `components/pools/internal`.
5. App routes, unrelated components, `lib`, and tests import Brackets and Pools
   UI only from `@/components/brackets` or `@/components/pools`, unless a test is
   the boundary test itself.

Keep feature-level boundary tests if the internal sub-feature folders continue
to have meaningful private seams. Those tests should operate within the owning
application, not define public access for the rest of the codebase.

## Domain and service boundaries

Eventually mirror the same idea in `lib`:

```text
lib/brackets/
  index.ts
  types.ts
  internal/

lib/pools/
  index.ts
  types.ts
  internal/
```

Do this after the UI boundary is stable. Domain code has more legitimate
low-level consumers, including API routes, repositories, and policy tests, so it
needs a separate audit before moving files.

## Migration approach

Do not do this as a blind folder move. First, clean the workspace and other
large composition files so the future import graph is easier to reason about.

When ready:

1. Audit current imports from `@/components/brackets/*` and
   `@/components/pools/*`.
2. Decide the minimal public exports for `components/brackets/index.ts` and
   `components/pools/index.ts`.
3. Move one application first, probably Pools, because its shared folder already
   raised the boundary question.
4. Update callers to use the application root.
5. Add application-level boundary tests.
6. Keep or revise internal feature-level boundary tests based on the new folder
   shape.
7. Run typecheck, relevant UI tests, build, and `git diff --check`.

## Open questions

1. Which route-level components should remain public application entry points?
2. Should tests ever import internal application modules directly, or should they
   always test through public application roots except for boundary tests?
3. Which existing `pools/shared` and `brackets/shared` pieces are truly
   application-internal, and which deserve promotion to `components/shared`?
4. How narrow should `lib/brackets` and `lib/pools` become after the UI migration
   proves out?
