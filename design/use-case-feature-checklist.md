# Brackeroni Use Case Feature Checklist

This document describes the product capabilities needed to support the three claimed Brackeroni use cases:

1. Bracket Brackets
2. Content Creator / YouTuber
3. Travel Decider

It is written as an implementation checklist for verification against the current product and codebase.

---

## Shared Foundation

These capabilities support all three use cases.

### Pools

A user must be able to create and manage a **pool** of candidates.

Required capabilities:

- Create a pool
- Add candidates to a pool
- Edit candidate name
- Edit candidate description
- Add or edit candidate image URL / thumbnail
- Remove candidates from a pool
- Reorder or seed candidates where relevant
- Reuse the same pool for multiple brackets
- Start a bracket from an existing pool

### Brackets

A user must be able to create a bracket from a pool.

Required capabilities:

- Create a draft bracket from a pool
- Configure bracket mode / result mode
- Configure sharing mode
- Start a bracket
- Vote on matchups
- Track bracket status: draft, active, complete
- View results
- View round progress / history where applicable
- Run again / clone a bracket from the same pool and settings

### Sharing

Required capabilities:

- Generate a share link
- Allow invited or public users to access the bracket
- Track participants
- Track whether each participant has completed their required voting
- Let the creator see participation / progress

### Results

Required capabilities:

- Winner display
- Match history / bracket progress
- Round-by-round results for synchronized brackets
- Aggregate results for parallel brackets
- Result highlights where useful, such as:
  - closest vote
  - most votes
  - biggest upset
  - biggest blowout
  - most divisive

---

# 1. Bracket Brackets

## Use Case Summary

The real-world tournament already has a field and results. Brackeroni lets a group either build one shared bracket together or make individual parallel brackets.

This use case is different from travel or creator imports because the user does not need to discover or import a messy list first. They are starting from a known tournament field.

## Core Setup Features

Required capabilities:

- Create a Bracket Bracket preset
- Support a **Set the field** setup flow
- Add teams to a pool
- Set seeds
- Confirm first-round matchups
- Preserve fixed bracket structure
- Start from the field without requiring a bookmarklet/importer flow
- Let the use-case CTA directly preconfigure the bracket type

## Required Modes

### Shared Play

Shared Play is a synchronized group bracket.

Required capabilities:

- Fixed bracket
- Winner-only result mode
- Group/friends sharing
- Synchronized round voting
- Everyone votes on the same matchups
- Group winner advances
- Creator can close rounds manually or after all required votes are in
- Final shared champion

This mode answers:

> What bracket did the group build together?

### Parallel Play

Parallel Play is individual brackets from the same field.

Required capabilities:

- Parallel bracket mode
- Each participant completes their own bracket path
- Same pool/field for every participant
- Individual picks are stored separately
- Aggregate/comparison results after real results are entered
- Participant leaderboard/scoring

This mode answers:

> Who made the best picks?

## Real Results Features

Bracket Brackets need real-world outcome tracking.

Required capabilities:

- Creator can enter actual winners as real tournament games finish
- Real results advance through the real bracket
- Brackeroni compares user/group picks against actual winners
- Results can update round by round as games complete

## Scoring and Result Features

### Shared Play Results

Useful result fields:

- Group champion
- Closest vote
- Least predicted winner
- "Right side of history" stat, such as:
  - who voted with the eventual real winners most often
  - who backed the eventual champion earliest or most consistently

### Parallel Play Results

Useful result fields:

- Best bracket
- Boldest correct pick
- Most different from the group
- Best contrarian
- Optional scoring bonus for being different from the group and right

## Use-Case Page CTAs

Likely CTAs:

- **Shared Play**
- **Parallel Play**

Each CTA should create or preconfigure the correct bracket type.

---

# 2. Content Creator / YouTuber

## Use Case Summary

A creator has a deep video archive and wants to turn it into a weekly audience voting event without replacing YouTube comments.

The creator problem is that the content treadmill keeps pushing attention toward the next upload, while older videos still have value but need a reason to come back into the conversation.

## Import and Setup Features

Required capabilities:

- Bookmarklet setup
- Import from a YouTube channel page, playlist, archive page, or selected page content
- Create a pool from imported video candidates
- Candidate fields should support:
  - title
  - thumbnail image
  - video URL
  - optional description
- Allow editing imported candidates
- Allow removing irrelevant videos
- Allow seeding the pool
- Allow the creator to shape the pool for audience fit

## Bracket Mode

The primary creator mode is:

- Winner-only
- Round-synchronized
- Public or public-unlisted voting
- Manual round reveal/closure controlled by creator

This use case is intentionally **not parallel by default**.

Reason: the creator wants a serialized audience event with weekly advancement.

## Voting Features

Required capabilities:

- Public voting link
- Voters can vote on current-round matchups
- Public vote totals are hidden until round close
- Creator can close/reveal a round
- Next round opens after reveal
- Round-by-round progression
- Final audience favorite / champion

## Creator Workflow Features

Required capabilities:

- Share link for audience
- Round status:
  - current round
  - votes received
  - matchups open/closed
- Creator can reveal what advanced
- Creator can use the bracket as a recurring weekly segment

Useful later:

- Copyable YouTube description text
- Copyable pinned comment text
- Copyable community post text
- Share card for current round
- Share card for results
- Candidate cards link back to original YouTube videos

## Result Highlights

Useful for weekly creator content:

- Closest matchup
- Biggest upset
- Biggest blowout
- Most votes
- Audience favorite
- Divisive matchup
- Sleeper hit
- Eliminated-too-early / robbed candidate language, if you want playful copy

## YouTube / Comments Relationship

Feature implication:

- Brackeroni handles vote structure and tallying
- YouTube remains the place for reactions
- Result/share screens should encourage returning to the video/comments

---

# 3. Travel Decider

## Use Case Summary

A family or group already has a destination but too many possible activities. They need to build a pool, vote through choices, and find what will delight the group most.

## Import and Setup Features

Required capabilities:

- Bookmarklet setup
- Import options from travel pages, guides, attractions pages, saved trip lists, or selected page text
- Create a travel pool from imported candidates
- Candidate fields should support:
  - name
  - description
  - image URL
  - source URL
  - optional category/tag such as museum, food, hike, major sight
- Allow manual additions to the pool
- Allow starting from a published pool
- Allow editing imported candidates
- Allow removing irrelevant candidates
- Allow adding/editing images

## Pool-First Workflow

Unlike Bracket Brackets, this use case needs pool creation before bracket creation.

Required flow:

1. Add importer
2. Import a travel page
3. Refine the pool
4. Start the group vote

The CTA should not imply that the user can immediately create a finished bracket without first building/refining the pool.

## Recommended Bracket Mode

Primary mode:

- Parallel brackets / parallel full ranking

Reason:

- Everyone can vote through their own matchups
- No round synchronization burden
- Better for group travel planning
- Result should identify group preferences, not necessarily a single champion only

## Voting Features

Required capabilities:

- Share link with fellow travelers
- Each participant votes through their own matchups
- Track participant completion
- Aggregate participant rankings
- Allow creator to close/finalize the group decision

## Result Features

Travel results should emphasize planning usefulness, not just a winner.

Required capabilities:

- Top picks
- Consensus pick
- Most divisive
- Individual favorites, if available
- Aggregate ranking
- Participant completion status

Useful later:

- Category-aware results:
  - top museum
  - top food option
  - top major sight
  - top outdoor activity
- Shortlist mode:
  - top 5 things to do
  - must do
  - save for later
- Itinerary export or planning notes

## Published Pools

Travel use case benefits from:

- Published travel pools
- Ability to start from a published pool
- Ability to clone/fork a published pool into your own editable pool

---

# Cross-Use-Case Mode Mapping

| Use case | First object | Default mode | Sync? | Main result |
|---|---|---|---|---|
| Bracket Bracket: Shared Play | Tournament field / pool | Winner-only fixed bracket | Yes | One shared group bracket |
| Bracket Bracket: Parallel Play | Tournament field / pool | Parallel bracket | No, except real results | Individual bracket leaderboard |
| Content Creator | Imported video pool | Winner-only synchronized bracket | Yes | Weekly audience champion |
| Travel Decider | Imported/refined travel pool | Parallel full ranking | No | Top picks / consensus / divisive |

---

# Product Terms to Preserve

Use these terms consistently:

- **Pool**: reusable set of candidates
- **Candidate**: thing being voted on
- **Bracket**: voting run created from a pool
- **Shared Play**: synchronized group bracket
- **Parallel Play**: individual brackets from the same pool
- **Set the field**: Bracket Bracket language for setting up tournament teams/seeds, while still using pool in the instructions

---

# Main Implementation Risks

The largest implementation risks are:

1. Real-results scoring for Bracket Brackets
2. Public round synchronization for Content Creator brackets
3. Aggregate/consensus result views for Travel Decider
4. Maintaining clear UX distinctions between synchronized brackets and parallel brackets
5. Teaching the word **pool** through actual workflows instead of hiding it
