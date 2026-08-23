# Agent termination and handoff protocol

In this repository, **"commit suicide"** is agent shorthand only. It means:
end the current agent run after creating a complete handoff for the next agent.
It never refers to people or real-world self-harm.

## When an agent commits suicide

Before ending its run, the agent must write or update this file with a section
named `## Current handoff` that states:

1. The user's active request and the concrete desired outcome.
2. What was completed, with relevant file paths.
3. What remains, in priority order, with the exact next implementation step.
4. Decisions already made, including constraints the next agent must preserve.
5. Verification run, its result, and any known failures or environmental
   blockers.
6. The working-tree warning: preserve unrelated user changes and do not reset,
   checkout, or delete them.

The handoff must describe the real state of the repository. Do not claim work
is complete when only a plan, scaffold, rename, wrapper, or partial extraction
exists.

## How to commit suicide

1. Stop making new changes when the current agent can no longer make reliable
   progress in its active run.
2. Update `## Current handoff` using the requirements above.
3. State plainly which files were changed and which remain problematic.
4. Run the smallest relevant verification when possible; otherwise record why
   it was not run.
5. End the current run only after the handoff is sufficient for the next agent
   to continue without rediscovering the work.

## Next-agent behavior

When a new agent sees this file, it must read `## Current handoff` before
editing. It should continue the recorded task rather than restart it, preserve
the user's dirty worktree, and update this handoff again if it must terminate.

## Current handoff

### Handoff updated

2026-08-23 by the current agent after the user asked: "read the suicide.md file
and do what it says". No feature implementation was attempted in this run.

### Active request

Bring the entire `components/brackets/configuration/` feature into compliance
with `reference-implementation.md`, as a cohesive refactor rather than a set
of cosmetic or tiny isolated changes.

### Completed

- This run: read `suicide.md`, confirmed it is a repository handoff protocol,
  and updated this handoff section only.
- The feature root contains only `index.ts`, `types.ts`, and `internal/`; its
  public-boundary test exists.
- The seeding god hook was split into `use-seeding-editor-state.ts`,
  `seeding-local-draft.ts`, and `use-seeding-autosave.ts`; the public consumer
  contract in `components/workspace/create-panels.js` was preserved.
- Seeding UI was decomposed into modal shell, group section, entry row/action
  menu, and save status components.
- `seeding-editor.module.css` owns the semantic modal, group, entry, and menu
  vocabulary; the feature-wide CSS pass is incomplete.
- Wizard pool paging moved to `use-wizard-pools.ts`; route pool/draft loading
  moved to `use-bracket-setup-data.ts`.
- Public types began using `lib/pools/types.ts` and `lib/brackets/types.ts`.

### Remaining work

1. Continue the configuration refactor from the existing dirty worktree. The
   exact next implementation step is to extract wizard form state, source
   validation, custom seeding, and submission
   construction from `bracket-creation-wizard.tsx` into a cohesive hook.
2. Extract pool creation, tournament creation/update, and navigation from
   `new-bracket-setup-page.tsx` into a cohesive submission hook.
3. Complete feature-local CSS, including moving wizard-specific
   `bracket-setup-*` styles out of `app/styles/foundation.css`.
4. Split independent controls in `wizard-choice-controls.tsx`, fix remaining
   reference formatting violations, narrow contracts, and add UI tests.
5. Run `npm.cmd run test:ui` and `npm.cmd run build` and report results.

### Constraints

- The user explicitly rejected incremental, cosmetic, or helper-only changes.
- Follow `design/lookandfeel.md` for user-facing style changes.
- Preserve public consumers and unrelated dirty worktree changes. Do not reset,
  checkout, or broadly delete files.

### Verification and blockers

- This run: `git status --short` was run before editing and confirmed a heavily
  dirty worktree with many modified, deleted, and untracked files. No tests were
  run because the user requested handoff termination only and no implementation
  files were changed.
- Previously passed before this handoff update: `npm.cmd run typecheck`,
  `npm.cmd run format:check`, and `git diff --check`.
- Sandboxed Node/Vitest runners fail with Windows `EPERM` when spawning a
  helper process; focused tests previously passed with approved escalation.
- This feature is incomplete and must not be claimed reference-compliant.
