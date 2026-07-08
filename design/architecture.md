# Architecture
This document translates the product rules in `domain.md` into an implementation plan. `domain.md` remains the authority on product behavior. This document is the authority on how the system should be built unless later implementation work proves a better approach is necessary.

# Goals
The architecture should optimize for:

1. Fast iteration by a small team
2. Low operational complexity for MVP
3. Clear support for authenticated users, private data, and invite-based sharing
4. Reliable bracket generation and round progression logic
5. Straightforward deployment without building excessive infrastructure too early
6. Clear separation between normal round-synchronized brackets and newer aggregate bracket modes

# Hosting Decision
## Recommendation
Use `Vercel Hobby` while the product is still iterating quickly.

Reasons:

1. The product still benefits from fast preview deploys and low infrastructure overhead.
2. Public content exists now, but most heavy logic is still request-driven rather than cron-driven.
3. This keeps deployment friction low while bracket variants and public surfaces are still being proven.

# Recommended Stack
## Frontend and Backend
Use `Next.js` with the App Router and plain `JavaScript`.

Reasons:

1. It gives a strong full-stack default for frontend, API routes, and authenticated app pages.
2. It keeps the codebase unified instead of splitting frontend and backend into separate repos too early.
3. It deploys well on Vercel, which is a good fit for MVP speed.
4. It still leaves room to move to AWS later if the product outgrows the initial hosting model.
5. It does not force TypeScript into a project that does not want it.

## UI
Use:

1. `React`
2. `JavaScript`
3. `Tailwind CSS`
4. A very small layer of semantic app classes for shared page patterns
5. A small component primitive library such as `shadcn/ui` where useful, but do not let it dictate the whole visual identity

Reasons:

1. Tailwind is fast for building the kind of dashboard and card-based UI this product needs.
2. The product has several management and workflow screens where a utility-first approach will move quickly.
3. Hand-drawn mockups suggest custom layout work, not an off-the-shelf admin template.
4. Recent work has shown that raw utility strings alone become unreadable quickly on shared surfaces such as the home page and vote flows.

Implementation guidance:

1. Repeated patterns should graduate into semantic classes in shared CSS.
2. Avoid giant one-off `className` strings for full page sections.
3. Prefer named rails, headers, cards, and layout wrappers when a pattern is product-level.

## Database
Use `PostgreSQL`.

Recommended provider for MVP:

1. `Neon` if deploying on Vercel
2. `RDS PostgreSQL` if deploying directly on AWS

Reasons:

1. The data model is relational.
2. Tournaments, entries, matches, votes, invitees, and ownership rules map naturally to SQL.
3. Full ranking and round progression will benefit from transactions and consistency.

## Database Access
Do not use an ORM.

Use:

1. raw SQL
2. a lightweight PostgreSQL driver such as `postgres` or `node-postgres`
3. a migration tool that does not impose an ORM model

Recommended options:

1. `postgres` for query execution in application code
2. `node-pg-migrate` or plain SQL migration files for schema changes

Reasons:

1. The relational model is important enough here that direct SQL is an advantage, not a burden.
2. Tournament progression, ranking, and reporting logic will benefit from explicit control over queries and transactions.
3. Avoiding an ORM keeps the persistence layer honest and makes query behavior easier to reason about.
4. This project is not large enough yet to justify ORM complexity.

## API Style
Use a REST-style API with an OpenAPI specification as the contract.

Reasons:

1. For a small system, OpenAPI gives enough structure without needing TypeScript everywhere.
2. It creates a clear contract between frontend and backend behavior.
3. It makes future integrations easier, including alternate clients or tooling.
4. It provides a better source of truth for request and response shapes than ad hoc route conventions.

The OpenAPI document should describe:

1. Authentication expectations
2. Resource schemas
3. Request validation rules
4. Response shapes
5. Error formats

REST constraints for this project:

1. Paths should be resource-oriented and noun-based, not RPC style. Avoid verb paths such as `/start`, `/close`, `/run`, and similar action endpoints.
2. State transitions should be represented by updating a resource (`PATCH /resource/{id}`) or creating a sub-resource (`POST /resource/{id}/sub-resources`) rather than command routes.
3. The API contract should expose hypermedia navigation with HAL-style `_links` metadata on resource and collection responses so clients can discover related actions and resources.
4. Each documented operation must be specific enough to be implementation-grade: include concrete request and response schemas, required fields, and expected error responses.
5. If a legacy or compatibility route is still present but not aligned with these rules, document it as deprecated behavior and keep it out of the primary REST resource model.

## Authentication
Use `NextAuth.js` / `Auth.js` with Google as the initial provider.

Reasons:

1. Google auth is already the chosen MVP requirement.
2. Auth.js integrates well with Next.js.
3. Session handling and provider setup are standard and well understood.

## File and Image Handling
Do not store uploaded images in MVP. Store validated external image URLs only.

The app should:

1. Accept external image links
2. Perform lightweight validation such as checking URL format and likely image content type where practical
3. Gracefully render broken images with fallback UI
4. Support external image suggestion lookups for candidate creation

Notes:

1. Suggested image quality depends heavily on the provider and on query ambiguity
2. Public/open providers are acceptable for MVP, but they may not match Google-quality media search
3. The chosen image stored by the app is still only the external URL

## Scheduling
Scheduled round closure is still not a primary product requirement.

Use a simple scheduled job mechanism rather than a custom worker system if background cleanup or stale-public-content maintenance becomes necessary.

Recommended options for that later phase:

1. Vercel cron jobs if hosted on Vercel
2. A lightweight background runner if hosted elsewhere

Any scheduler should only be responsible for:

1. Detecting rounds that should close
2. Running round closure logic idempotently
3. Optionally identifying stale public content for admin review

## Testing
Use:

1. `Vitest` for unit and integration tests
2. `Playwright` for end-to-end tests

The bracket engine should be heavily unit tested.

# Deployment Recommendation
## MVP Recommendation
Use:

1. `Vercel Hobby` for app hosting
2. `Neon` for PostgreSQL
3. `Auth.js` with Google OAuth

Reasons:

1. Minimal infrastructure overhead
2. Good fit for a Next.js app
3. Fast deploy-preview workflow
4. Enough capability for the MVP product shape

## Future Migration Path
If needed later, the app can move to AWS with:

1. Next.js hosted on container or serverless infrastructure
2. PostgreSQL on RDS
3. Background jobs on a more explicit scheduler or queue

# Application Structure
Use a single repository with one application.

Suggested top-level structure:

1. `app/` for routes and UI
2. `components/` for reusable UI components
3. `lib/` for shared utilities
4. `lib/auth/` for auth configuration
5. `lib/db/` for SQL helpers, connection management, and persistence code
6. `lib/tournament/` for bracket logic
7. `lib/validation/` for schemas and input validation
8. `openapi/` for the API specification
9. `db/` for SQL schema and migrations
10. `tests/` for unit and integration tests

# Data Model
## User
Represents an authenticated person.

Core fields:

1. `id`
2. `email`
3. `name`
4. `image`
5. auth provider metadata
6. timestamps

## Candidate
Private to its creator.

Core fields:

1. `id`
2. `creatorUserId`
3. `name`
4. `description`
5. `imageUrl`
6. timestamps

## CandidatePool
May be private or published.

Core fields:

1. `id`
2. `creatorUserId`
3. `name`
4. optional `description`
5. timestamps

## CandidatePoolItem
Join table between pools and candidates.

Core fields:

1. `id`
2. `poolId`
3. `candidateId`
4. optional display order

## Tournament
Represents the tournament definition and lifecycle.

Core fields:

1. `id`
2. `creatorUserId`
3. `title`
4. optional `description`
5. `sourcePoolId` nullable
6. `sharingMode` enum: `private`, `with_friends`
7. `playStyle` enum: `reseed`, `fixed_bracket`
8. `resultMode` enum: `winner_only`, `full_ranking`, `fast_full_rank`
9. `tieBreakMode` enum: `higher_seed_wins`, `random`
10. `status` enum: `draft`, `active`, `complete`
11. `roundClosureMode` enum: `manual`, `all_votes_received`, `automatic_when_settled`
12. `scheduledCloseAt` nullable
13. `startedAt` nullable
14. `completedAt` nullable
15. timestamps

Notes:

1. `all_votes_received` is valid only for `with_friends`
2. `automatic_when_settled` is effectively the private mode behavior
3. `scheduledCloseAt` is reserved for a later phase and should remain unused in MVP
4. `sourcePoolId` being nullable is intentional so a draft bracket can exist before a pool is attached
5. Normal `tournament` rows represent the round-synchronized bracket family only

## ParallelTournament
Represents an aggregate bracket whose participants each receive a personal child tournament.

Core fields:

1. `id`
2. `creatorUserId`
3. `title`
4. optional `description`
5. `sourcePoolId`
6. `sharingMode`
7. `visibility`
8. `votingAccess`
9. `tieBreakMode`
10. `status`
11. timestamps

Notes:

1. This exists as a separate structure on top of normal tournaments.
2. It should not be squeezed into the normal `tournament.resultMode` lifecycle because the progression model is materially different.

## ParallelTournamentParticipant
Represents one participant in a parallel bracket.

Core fields:

1. `id`
2. `parallelTournamentId`
3. nullable `userId`
4. nullable `anonymousVoterToken`
5. nullable `tournamentId` for the personal child bracket
6. `status`
7. timestamps

Notes:

1. The participant may be authenticated or anonymous for public voting contexts.
2. `tournamentId` points at the participant's personal child bracket when it has been opened.

## TournamentEntry
Represents a candidate's placement inside a tournament.

Core fields:

1. `id`
2. `tournamentId`
3. `candidateId`
4. `seed`
5. final `rank` nullable
6. timestamps

## TournamentInvite
Represents the invite roster for `with_friends`.

Core fields:

1. `id`
2. `tournamentId`
3. `userId`
4. `status` enum: `pending`, `locked`
5. `joinedAt`

Notes:

1. Before start, invitees are accumulated by share-link joins.
2. At tournament start, the roster is locked.

## ShareLink
Represents a join token for a draft friends tournament.

Core fields:

1. `id`
2. `tournamentId`
3. `token`
4. `active`
5. `createdByUserId`
6. timestamps

Notes:

1. Multiple share links may be useful if the creator reshapes access later.
2. MVP can start with one active link per draft tournament if simpler.

## Round
Represents a unit of active voting and progression.

Core fields:

1. `id`
2. `tournamentId`
3. `sequenceNumber`
4. `status` enum: `pending`, `active`, `closed`
5. `openedAt`
6. `closedAt` nullable
7. `scheduledCloseAt` nullable

## Match
Represents one head-to-head decision.

Core fields:

1. `id`
2. `tournamentId`
3. `roundId`
4. `leftEntryId` nullable
5. `rightEntryId` nullable
6. `leftSlotType`
7. `rightSlotType`
8. `leftSlotRef`
9. `rightSlotRef`
10. `status` enum: `pending`, `open`, `closed`, `auto_resolved`
11. `winnerEntryId` nullable
12. `resolutionSource` enum: `vote`, `bye`, `prior_result`, `tie_break`
13. `pairKey`
14. timestamps

Notes:

1. `pairKey` should deterministically identify the matchup regardless of left/right ordering.
2. Virtual slots are represented by `slotType` plus `slotRef`.

## Vote
Represents one immutable user vote on one match.

Core fields:

1. `id`
2. `matchId`
3. nullable `userId`
4. nullable `anonymousVoterToken`
5. `selectedEntryId`
5. timestamps

Constraints:

1. Unique on `matchId + userId` when `userId` is present
2. Unique on `matchId + anonymousVoterToken` when anonymous voting is present

# Core Logic Boundaries
## Bracket Engine
Put all tournament progression logic under `lib/tournament/`.

This code should own:

1. Initial bracket construction
2. Bye assignment
3. Round generation
4. Reseeding
5. Replay detection
6. Automatic advancement from prior results
7. Full ranking progression
8. Tie resolution
9. Tournament completion checks

This logic should be mostly framework-independent and heavily unit tested.

## Application Services
Use server-side services for:

1. Candidate CRUD
2. Pool CRUD
3. Tournament creation and cloning
4. Voting
5. Round closure
6. Invite join flow
7. Parallel bracket participant management
8. Public featured-content management

These services should own authorization and transactional updates.

# API and Mutation Style
Prefer explicit REST route handlers over server actions for core domain operations, since the system should have a clean OpenAPI-described interface.

Use schema validation on all external inputs. `Zod` is a good fit.

Keep SQL in explicit query modules or repository-style files rather than scattering query strings through route handlers.

Keep tournament logic in plain services rather than embedding domain behavior directly in route files.

# Authorization Rules
At minimum enforce:

1. Only creators can edit their candidates and pools
2. Only creators can edit draft tournaments they own
3. Only eligible users can vote in a match
4. Only creators can manually start or close tournaments
5. Only creators can generate or revoke share links for their draft friends tournaments
6. Only admins can modify published pools or manage featured public content

# Scheduling and Idempotency
Round closure must be idempotent.

That means:

1. Running closure twice should not create duplicate next-round matches
2. Scheduled jobs and manual closure should converge on the same result
3. Replay auto-resolution should be deterministic

Use transactions around:

1. Closing a round
2. Generating the next round
3. Assigning rankings
4. Starting a tournament

# MVP UI Sections
## Public Surfaces
The product now includes public-facing surfaces.

These include:

1. Home page featuring
2. Public pools index
3. Public bracket visibility

## Vote
Show:

1. Active tournaments the user can vote in
2. Round number
3. Voting completion status for the current round
4. History and completed results

## Create
Show:

1. Brackets
2. Candidate pools
3. Draft/edit/start controls

Notes:

1. The bracket creation flow is the primary entry point
2. Draft brackets are edited inline rather than through a dedicated creation modal
3. Draft bracket fields persist as the user edits them
4. Draft brackets should support a collapsed summary state after editing
5. `parallel_full_ranking` should appear as a normal result-mode choice in the create experience even if its backend structure is different

# Development Iterations
## Iteration 1: Foundation
Deliver:

1. Next.js app setup
2. JavaScript
3. Tailwind
4. PostgreSQL connection and migration setup
5. Auth.js with Google
6. OpenAPI scaffolding
7. Basic app layout and navigation

Exit criteria:

1. A user can sign in
2. Authenticated pages work
3. Database migrations run cleanly

## Iteration 2: Candidate and Pool Management
Deliver:

1. Candidate CRUD
2. Candidate pool CRUD
3. Candidate image suggestion assistance from external providers
4. Privacy enforcement for candidates and pools

Exit criteria:

1. A user can create and edit candidates
2. A user can create and edit pools
3. Pools can contain reusable candidates

## Iteration 3: Tournament Definitions
Deliver:

1. Tournament CRUD in draft state
2. Seeding configuration
3. Sharing mode selection
4. Result mode selection
5. Tie-break mode selection
6. Clone flow
7. Bracket-first draft creation flow
8. Inline pool attachment and creation from draft brackets

Exit criteria:

1. A user can define a tournament without starting it
2. Cloning produces a new draft tournament correctly

## Iteration 4: Bracket Engine
Deliver:

1. Initial bracket generation
2. Byes
3. Fixed bracket progression
4. Reseed progression
5. Replay detection and prior-result auto-resolution
6. Unit tests for core tournament logic

Exit criteria:

1. The system can generate and progress tournaments without UI voting
2. Edge cases are covered in tests

## Iteration 5: Voting and Round Closure
Deliver:

1. Match voting UI
2. Immutable vote submission
3. Manual round closure
4. Tie-break resolution

Exit criteria:

1. Users can vote through a round
2. Rounds close correctly
3. Next rounds are generated correctly

## Iteration 6: Friends Sharing
Deliver:

1. Friends share-link join flow
2. Pending invitee accumulation
3. Invite lock on start
4. Eligibility checks by sharing mode

Exit criteria:

1. Draft friends tournaments can collect invitees
2. Starting a friends tournament locks the roster
3. Only eligible users can vote

## Iteration 7: Full Ranking and Views
Deliver:

1. Automatic full ranking continuation
2. Vote index page
3. Management views
4. Status badging
5. Public browse surfaces

Exit criteria:

1. Full ranking tournaments complete with all ranks assigned
2. Main product flows are navigable end to end

## Iteration 8: Hardening
Deliver:

1. End-to-end tests
2. Better empty/error/loading states
3. Basic analytics/logging
4. Deployment polish
5. Performance review on key flows

# Risks
## Main Technical Risk
The bracket engine is the highest-risk part of the system, especially:

1. Full ranking with no replays
2. Reseeding with prior-result promotion
3. Idempotent round closure

This is why tournament logic should be isolated and tested before heavy UI polish.

## Product Risk
The main product risk is still complexity in the ranking and bracket rules, not scale.

Another meaningful MVP risk is external image suggestion quality. Public/open providers may be good enough for many queries but weak for ambiguous movie, show, and pop-culture names.

Another meaningful risk now is conceptual drift between:

1. normal round-synchronized brackets
2. public visibility and access rules
3. parallel aggregate brackets

The UI should keep those differences clear without creating separate-feeling products unless the behavior truly differs.

# Open Implementation Questions
These are not product-definition gaps, but implementation choices that may still need decisions later:

1. Whether to use server actions, route handlers, or a mix for mutations
2. Whether share links should be single-use, reusable, or revocable-only in MVP
3. Whether scheduled closures should operate at exact timestamps or on coarse polling intervals in a later phase
4. Whether random tie-breaks should be cryptographically strong or just application-random
