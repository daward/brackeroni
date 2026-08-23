# Pools reference implementation

Pools is the reference functional area for improving other parts of the codebase. The goal is clear ownership, small public surfaces, explicit contracts, and regression coverage—not identical component structures.

## Feature structure

Use this layout when a feature needs a meaningful boundary:

```text
components/<area>/<feature>/
  index.ts
  types.ts
  internal/
```

`index.ts` and root `types.ts` are the public API. Other features import only from the feature root. `internal/` contains implementation and private styles; add a boundary test that rejects imports into it.

After a feature has been migrated, its component-directory root contains only
`index.ts`, `types.ts`, and `internal/`. Do not leave implementation files,
private styles, or compatibility wrappers beside the public API files.

Document the boundary where it is defined. `index.ts` should begin with a concise comment explaining the functional area it exposes and the intended public entry points. `types.ts` should begin with a concise comment explaining which public component contracts and callbacks it provides. Keep those comments current when the feature surface changes; they are part of the API, not filler.

## Domain types

Product records belong in `lib/<area>/types.ts`, rather than component folders. For Pools this includes `PoolCandidate`, `PoolDraft`, `PoolDetail`, and `PoolVisibility`. Feature `types.ts` files describe component props and public callbacks. Do not duplicate domain records or expose private controller types.

## TypeScript adoption

A reference-area refactor is a TypeScript migration, not only a TypeScript
facade around JavaScript implementation. New and touched feature entry points,
contracts, internals, and extracted domain policies must use `.ts` or `.tsx`
as appropriate. Do not leave a newly established `index.ts` and `types.ts`
wrapping `.js` or `.jsx` internals.

When a functional area is being brought up to this reference, convert the
feature entry points, public contracts, internals, and domain policies owned by
that feature to TypeScript. Existing parent consumers and external
orchestration do not need to migrate merely because they consume the new public
feature API. Keep those boundaries narrow and compatible; migrate a parent only
when its own refactor is deliberately in scope. If a temporary mixed-language
boundary exists _inside_ the feature, document the explicit remaining migration
scope and do not call the area complete until that scope is finished.

## Component contracts

Give children only the values and callbacks they need. Do not pass an entire page controller into a menu, card, or drawer. Keep presentation choices grouped by concern instead of growing a flat list of unrelated Boolean flags. If configuration keeps growing, split the component.

Public contracts are source code meant to be read and maintained. Format type
aliases and prop objects with one field per line; wrap callback parameters and
long unions over multiple lines. Do not compress a component contract into a
single long line, even when TypeScript accepts it.

### Line length and readable formatting

Keep source lines at 180 characters or fewer. This is a maintainability rule,
not a suggestion: wrap object literals, function signatures, JSX props, boolean
conditions, callback chains, and type declarations before they become difficult
to scan. An exception needs a concrete technical reason, such as an externally
defined URL or an unbreakable generated value; it must be local and rare.

Do not use nested or chained ternary operators. On pain of death, use guard
clauses, named conditions, a lookup object, or a `switch` when more than one
decision is needed. A single ternary for one simple binary choice is fine;
nested or cascading ternaries hide control flow and are forbidden.

`any` is unacceptable in feature `types.ts` files. Public contracts must name
the actual domain records, values, and callbacks they expose; use narrowly
defined types rather than an untyped escape hatch.

## Component files

Give each independently reusable UI control or component its own file. Do not
combine siblings merely because they are small or share a few styles; separate
files make ownership, contracts, tests, and future changes clear. A component
file may keep tightly coupled private render helpers that are not reusable
outside that component, but it must not become a collection of peer controls.
Use a short barrel file when a group needs a convenient internal or public
import surface.

## Hook design

Page hooks may compose feature state but should not own every concern. Extract private hooks around coherent lifecycle responsibilities. The parent hook should read as composition, not as every network mutation in the feature.

## Shared primitives and CSS

Reuse a shared primitive only for a stable site-wide pattern: drawers, cards, image rails, pagination, toasts, resilient images, or inline titles. Candidate-specific interactions remain in the candidate feature.

Follow `design/lookandfeel.md` for visual work. Keep feature CSS in co-located modules using semantic names. Keep true site-wide patterns in readable shared classes. Avoid giant one-off utility strings and avoid making CSS-module names the vocabulary for global design patterns.

## Tests

Test pure policies with Node tests; user interaction and accessibility with Vitest/Testing Library; encapsulation with boundary tests; and contracts with `npm.cmd run typecheck`. When a bug is found, add the smallest test that would have caught it before changing implementation.

## Verification

For a substantial feature refactor, run:

```powershell
npm.cmd run typecheck
npm.cmd run test:ui
npm.cmd run build
git diff --check
```

Do not claim the full suite passes if it has an unrelated pre-existing failure; report that condition plainly.

## Checklist

1. Move domain records to `lib/<area>/types.ts`.
2. Convert the scoped feature, its internals, and extracted domain policies to TypeScript.
3. Establish a documented public feature entry point, documented public contracts, and `internal/`.
4. Replace whole-controller props and duplicated shapes with narrow contracts.
5. Split oversized orchestration hooks by responsibility.
6. Audit CSS for semantic locality and legitimate shared primitive use.
7. Add boundary tests and regression tests for known failure modes.
8. Run verification and inspect affected UI at relevant sizes.
