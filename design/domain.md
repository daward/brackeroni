# Concept
This application helps a user make a decision by organizing a set of candidates into a head-to-head tournament tree. Users compare candidates one versus one until a final winner is produced.

In user-facing copy, the product should prefer the word `bracket`. The word `tournament` may still be used internally in code, APIs, and data structures where that is already established.

The system must support two ranking modes:

1. `winner_only`: the tournament ends after first place is determined.
2. `full_ranking`: the tournament continues after first place so the system can derive a complete ordered ranking without replaying prior matches.

The ranking behavior is based on tournament sort:
https://en.wikipedia.org/wiki/Tournament_sort

In `full_ranking`, second place is determined from the set of candidates that lost to the first-place winner. Third place is determined from the candidates that lost to either the first-place or second-place finisher and that do not require replaying an already-settled matchup. The same idea continues until all candidates have been ranked. Avoiding replays is a core rule of the system.

# Basic Technical Requirements
This is a standard web application with frontend, backend, database, authentication, and persistent storage for all user-created data.

Initial authentication should be Google sign-in. Other providers may be added later. Google identity may also be used to support the future friends/invite model.

Deployment target is still open. AWS is acceptable. An all-in-one platform such as Vercel may also be acceptable if it fits the hosting model and cost goals.

# MVP Scope
The MVP should include:

1. Candidate creation
2. Candidate pool creation
3. Tournament creation
4. Tournament voting
5. Round closure
6. Tournament cloning
7. Private and friends sharing modes
8. `winner_only` and `full_ranking` tournament modes
9. Google authentication
10. Image suggestion assistance during candidate creation, using external sources only

The MVP should not include:

1. Image storage by the platform
2. Push notifications
3. Public tournaments
4. Public tournament recommendation logic beyond a simple list or feed

# Entities
## Candidate
A candidate is the most basic unit in the system. A candidate belongs to the user who created it and is private to that creator for now.

A candidate should have:

1. Name
2. Optional description
3. Optional image link
4. Creator

An example candidate would be a lobster roll, with a description such as "Expensive, but decadent offering of lobster chunks served cold with mayonnaise on a top-cut hot dog bun."

The platform should store image links only. It should not store image files in the MVP.

## Candidate Pool
A candidate pool is a reusable grouping of candidates. It is independent from tournaments because the same candidate may appear in multiple pools, and the same pool may be used to create many tournaments.

For example, a lobster roll might appear in both:

1. `Most New England Foods`
2. `Best Tasting Sandwiches`

## Tournament
A tournament is a run of the decision process against a specific candidate pool or cloned tournament definition.

A tournament should support:

1. Any pool size, not just powers of two
2. Balanced bracket construction with byes assigned to higher seeds
3. Manual or random seed assignment at creation time
4. Tracking the current round
5. Tracking a visible lifecycle status such as `draft`, `active`, and `complete`
6. Creating new matches from the not-yet-eliminated candidates
7. `reseed` and `fixed_bracket` play styles
8. `winner_only` and `full_ranking` result modes

### Reseeding
If `reseed` is enabled, the highest remaining seed should play the lowest remaining seed, then the second-highest remaining seed should play the second-lowest remaining seed, and so on.

If reseeding would call for a matchup that has already been played earlier in the same tournament, that prior result is authoritative. The previously established winner is promoted without collecting new votes for that replayed matchup.

If `fixed_bracket` is enabled, candidates continue through the bracket slots they were originally assigned to.

## Tournament Entry
A tournament entry is a candidate as placed into a specific tournament.

At minimum, a tournament entry must uniquely represent:

1. The candidate
2. The tournament
3. The seed assigned within that tournament

The seed is the core tournament-specific value on the entry.

## Match
A match exists within a tournament and contains exactly two tournament entries, though one or both sides may be unresolved placeholders until the prior round settles.

A match is the unit users vote on. When a match closes, it records a winner.

Matches should be uniquely identifiable within a tournament in a way that allows the system to recognize when the same two seeded entries have already played, so replayed matchups can be resolved from prior results instead of generating duplicate voting.

Depending on tournament type, a match may include virtual participants:

1. In `fixed_bracket`, a slot may represent "winner of previous match"
2. In `reseed`, a slot may represent "highest seed remaining", "lowest seed remaining", "second highest seed remaining", and so on

## Vote
A vote records a user's choice in a specific match.

For the MVP:

1. A logged-in user may vote at most once per match
2. Votes are stored per user
3. Votes are final once submitted and cannot be changed
4. A user must be able to review what they voted for within a tournament

# Behaviors
## Voting
All matches in the current round can be presented to an eligible voter.

The user should be presented one matchup at a time. After they vote on every match in the current round, they should be thanked and shown that they are done for that round.

If the voter is also the tournament creator and the tournament allows manual closure, they should be offered the option to close the round or wait.

### Voting eligibility
Sharing mode determines who may vote:

1. `private`: only the creator may vote
2. `with_friends`: any invited user may vote at any time while the current round is open

### Tie behavior
Tie resolution must be configurable per tournament.

For the MVP, supported tie-break modes are:

1. `higher_seed_wins`
2. `random`

## Candidate Creation
A user creates a candidate by entering a name and optionally adding a description and image link.

The MVP should support external image suggestion assistance during candidate creation. Users should still be able to provide their own image link manually.

Suggested images should come from external sources. Quality may vary by query and provider. The system does not need to guarantee Google-quality search results in MVP.

## Candidate Pool Creation
Candidate pools remain the reusable source list behind brackets, but they should not be the primary conceptual entry point in the UX. A user is usually here to create a bracket first, then attach or create the needed pool.

A user may still create a standalone pool such as `National Parks` and then add candidates to it.

During this flow, the user should be able to:

1. Create a new candidate
2. Edit an existing candidate already in the pool
3. Reuse one of their existing candidates through search by name in a later phase if that feature is brought back

## Tournament Creation
The user can create a bracket either from a candidate pool or by cloning an existing bracket definition.

The bracket creation flow should be bracket-first:

1. Creating a new draft bracket should be the main call to action
2. A draft bracket may exist before a pool has been attached
3. A draft bracket may create and attach a new pool inline
4. A draft bracket should autosave configuration edits
5. A draft bracket should be collapsible into a non-editing summary state so the user can feel done editing without starting it yet

When building from a pool, the user should choose:

1. Tournament play style: `reseed` or `fixed_bracket`
2. Result mode: `winner_only` or `full_ranking`
3. Seeding mode: manual or random
4. Sharing mode
5. Tie-break mode

In practice, seeding controls such as manual seed ordering and pool sync only make sense after a pool has been attached.

### Sharing modes
The tournament sharing modes are:

1. `private`: only the creator can vote. Rounds close automatically once all matches in the round have been settled.
2. `with_friends`: only invited users can vote. Rounds can be closed manually by the creator or automatically once every invited user has voted on every match in the current round.

### Friends invite flow
For the MVP, `with_friends` should be based on a share link.

Before the tournament starts:

1. The creator shares an invite link
2. A recipient opens the tournament and is shown that the tournament starts soon
3. That recipient is added to the pending invitee list for that tournament
4. The creator may remove invitees or continue sharing the link to allow additional people to join

When the creator starts the tournament, the invitee list is locked and cannot change for the life of that tournament.

## Tournament Cloning
Cloning a tournament creates a new tournament definition that is ready to start but has not yet started.

Cloning should copy:

1. Candidate set
2. Seeds
3. Sharing mode
4. Invitees
5. Tournament play style
6. Result mode
7. Tie-break mode
8. Existing invitees

Cloning should not copy:

1. Started state
2. Rounds
3. Matches
4. Votes
5. Winners
6. Rankings already produced

## Tournament Start
When a tournament starts, it has all information necessary to run.

For `with_friends` tournaments, starting the tournament locks the invitee list. After start, no invitees may be added or removed.

For `with_friends` tournaments, the system should notify the invited users through whatever invitation or messaging mechanism is ultimately chosen. Push notifications are future work and not required for MVP.

A tournament should exist in a draft state before start, become active while voting or ranking is in progress, and become complete when all requested results have been produced.

## Round Closure
When a round closes, whether manually or because an automatic condition was met, every match in that round is tallied and assigned a winner.

The next round of matches is then resolved from the tournament rules:

1. Prior winners advance
2. Virtual slots resolve to the correct entries
3. If reseeding would require a replay, the previously established winner advances automatically

If a replayed matchup is resolved automatically from a prior result, it should still be shown in the bracket as a settled match so the bracket remains understandable to users.

In `with_friends`, automatic closure based on "all votes received" means that every invited user has voted on every match in the current round.

In `full_ranking`, the system should continue automatically after first place is determined until the complete ranking has been produced.

## Landing Page Behavior
The landing page should show:

1. Tournaments you are voting in
2. Tournaments you are managing

### Tournaments you are voting in
This list includes:

1. Active `with_friends` tournaments shared with you
2. Private tournaments you have started

For each such tournament, the UI should indicate whether you have completed voting in the current round. The user should be able to re-enter the round to vote or review their prior votes.

### Tournaments you are managing
This list includes tournaments you created, with active tournaments prioritized, likely sorted by date. The management view should also provide access to your candidate pools and your candidates.

## Explore View
The `Explore` area is not part of the MVP. Public tournaments and public discovery should be added in a later phase.

## Vote Views
The voting area should include:

1. A list of active tournaments the user can vote in
2. Visible round information
3. A history area for previously completed tournaments and results
4. A focused one-match-at-a-time voting flow once a user enters a bracket
5. Candidate images during voting where available

## Results Views
Completed brackets should have a dedicated results experience.

That experience should include:

1. Final ranking
2. Winner emphasis
3. The selected candidate's record within the bracket
4. Match history in the order the candidate played
5. Opponent identity and image where available

## Tournament Status Badging
Tournament lists and summary cards should visibly badge important state, including at minimum:

1. Draft versus active versus complete
2. Whether a tournament is currently voting/open
3. Whether the user has completed all votes for the current round

## Privacy Rules
For the MVP:

1. Candidates are private to their creator
2. Candidate pools are private to their creator
3. Tournaments may be private or shared with friends according to their configured sharing mode

## Image Links
The platform should accept externally hosted image links in the MVP.

The system should make a reasonable effort to confirm that a link appears to reference an image before rendering it, but broken links are acceptable and expected in some cases. The platform does not need to guarantee permanence or ownership of externally hosted images.

The system may also suggest candidate images from external providers, but it should still only store the chosen external URL.

