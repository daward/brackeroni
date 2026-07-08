# Brackeroni Product Goals

This document describes the product intent behind Brackeroni. It sits above the domain, architecture, and look-and-feel documents. Those documents define the nouns, technical plan, and visual system; this document defines what the product is trying to accomplish and how product decisions should be judged.

## Purpose

Brackeroni helps people choose from too many options.

The product works because people often struggle to rank a large set directly, but they can usually answer a small comparison: one or two. Brackeroni turns a pool of choices into a sequence of quick matchups so an individual or group can find what rises to the top.

The product can be playful, but the core problem is real. A person planning a day, a family choosing weekend activities, a group picking games, or friends deciding what to do on a trip all face the same basic problem: the pool is larger than the decision they need to make.

## Core Belief

Large choice sets are difficult to reason about all at once. Pairwise comparison lowers that cognitive burden.

Brackeroni should feel like an optometrist test for preferences:

> One or two? One or two? One or two?

The product should not ask users to hold a giant pool in their heads, manually rank dozens of candidates, or debate every option in a group chat. It should break the decision into simple head-to-head choices and stop when the result is useful enough for the selected goal.

## Product Model

The core product model is:

```text
Pool → Session → Result
```

### Pool

A pool is a reusable set of candidates.

A pool might contain board games, Disney attractions, museums on the National Mall, weekend events, escape rooms, sandwiches, movies, minor Simpsons characters, restaurants, hikes, or anything else people might choose between.

A pool is not only a one-time import. It can be reused across sessions. This is especially important for recurring decisions such as game night, movie night, lunch spots, family activities, or ongoing group preferences.

### Session

A session is a run of the decision process against a pool.

A session may be private, friends-only, public listed, or public unlisted. It may use a classic bracket structure, a full-ranking bracket, a faster Swiss-style ranking mode, or a parallel personal-ranking flow aggregated across participants.

A session should have an intent. The most important intents are:

1. Pick one winner
2. Make a shortlist
3. Find group favorites
4. Rank everything

The product should not assume every session needs a perfect total ordering.

### Result

A result is the useful output of a session.

Depending on intent, the result might be:

1. A single winner
2. A top tier
3. A practical shortlist
4. A full ranking
5. Consensus picks
6. Divisive picks
7. Per-participant rankings
8. A record of how a candidate advanced

The result should match the decision the user was trying to make.

## Primary Use Cases

### Decision from too many options

This is the most important consumer use case.

Examples:

1. A family sees a list of 100 things to do this weekend and wants to pick a few.
2. A child cannot decide what to see on the National Mall in one day.
3. A group planning a trip needs to narrow dozens of activities into a realistic plan.
4. A birthday party group wants to know which escape rooms or activities people most want to do.

The job is not to celebrate the pool. The job is to reduce the pool into a decision.

### Favorite-finding

This is the playful use case that makes the product feel alive.

Examples:

1. Best minor Simpsons character
2. Best Disney attraction
3. Best sandwich
4. Best cat
5. Best movie
6. Best board game

The job is to make preference visible and fun. A winner matters, but the voting experience itself is part of the appeal.

### Recurring group pools

This is where pools become more valuable than one-off brackets.

Examples:

1. A game-night group keeps a pool of games and runs a new session each week.
2. A family keeps a pool of local activities.
3. Friends keep a pool of restaurants or movies.
4. A travel group builds an activity pool before a trip and runs several decision sessions from it.

The product should treat the pool as a durable asset, not disposable setup data.

### Public examples and discovery

Public brackets and published pools help the site feel alive. They provide examples, give users something to try immediately, and may become a discovery path for new users.

Public content is valuable, but it is not the center of the product. Public brackets should support the core product promise rather than redefining Brackeroni as a public voting site.

## Product Positioning

Brackeroni should lead with the decision problem, not the bracket object.

Good framing:

> In a world of choice, take it one matchup at a time.

Other useful positioning lines:

> Turn a pool of choices into quick matchups.

> Find the winner, shortlist, or group favorite hiding inside a big pool.

> Too many choices? Vote your way to one.

The product can still use bracket language. Brackets are part of the fun and part of the visual identity. But the user benefit is not merely building brackets. The benefit is making large choice sets playable and actionable.

## Product Vocabulary

### Pool

`Pool` is the preferred product word for the reusable set of candidates.

A pool is more than a list. A list can be static and disposable. A pool is a source of future sessions.

The homepage and importer may need to teach the word through context. Do not replace `pool` everywhere with `list` just because `list` is easier. Instead, make the meaning clear:

> Start from a pool.

> Import a pool.

> Pick a pool, then vote it down to a winner or shortlist.

### Bracket

`Bracket` is the preferred user-facing word for structured matchup voting.

`Tournament` may remain an internal implementation term in code, APIs, and database structures.

### Candidate

A candidate is an option inside a pool or bracket.

Candidates should remain concrete and visible. Images, names, and short descriptions matter because Brackeroni works best when people can make fast comparisons.

### Matchup

A matchup is the core interaction: two candidates, one choice.

The user experience should make this feel fast, obvious, and satisfying.

## Session Modes and Intent

### Pick one winner

Use this when the user wants a champion.

Good for:

1. Fun debates
2. Favorites
3. Public brackets
4. Live voting
5. Low-stakes arguments

The result can emphasize the winner and the path taken to get there.

### Make a shortlist

Use this when the user needs a manageable set of top options rather than a single champion.

Good for:

1. Weekend activities
2. Travel planning
3. Birthday activities
4. Restaurants
5. Escape rooms
6. Attractions

This mode should avoid unnecessary work. It should stop when the top tier is stable enough for the decision.

### Find group favorites

Use this when multiple people need to participate and consensus matters.

Good for:

1. Game night
2. Family outings
3. Group trips
4. Parties
5. Shared planning

The result should make agreement and disagreement visible. The most useful result may be the safest consensus pick, not the most polarizing champion.

### Rank everything

Use this when the user explicitly wants a full ordered ranking.

Good for:

1. Personal rankings
2. Completionist lists
3. More serious preference discovery
4. Comparing final rankings across people

This mode can require more structure and more voting. It should be framed as heavier than making a shortlist or picking a winner.

## Rounds and Synchronization

Rounds are optional.

Synchronized rounds are useful for classic brackets, public events, live party voting, and full-ranking modes where the bracket structure is part of the experience.

Synchronized rounds are a poor fit for many consumer planning decisions. They create friction when people are voting asynchronously over hours or days.

The product should use matchups everywhere, but only use rounds when rounds help.

### Good uses for rounds

1. Public live brackets
2. Classic winner-only brackets
3. In-person party voting
4. Full ranking where progression structure matters
5. Brackets where the ceremonial tournament feeling is part of the fun

### Poor uses for rounds

1. Family weekend planning
2. Travel activity shortlisting
3. Birthday party activity planning
4. Asynchronous group decisions
5. Recurring game-night selection where people should be able to vote independently

For non-round use cases, the product should support asynchronous pairwise voting and continuously improving results.

## Result Principles

### Stop when the decision is good enough

Brackeroni should not force unnecessary completion.

For many decisions, the user does not need to know the exact order of every candidate. They need to know which options are worth considering, which ones the group clearly likes, or which option should be chosen now.

The product should make it clear when enough voting has happened to produce a useful result.

Example language:

> Your group has voted enough to identify a strong top tier.

> More votes may refine the order, but the shortlist is already stable.

### Show the payoff

The result page should be a first-class product surface, not an afterthought.

Useful result views include:

1. Winner
2. Top tier
3. Shortlist
4. Full ranking
5. Consensus picks
6. Most divisive candidates
7. Candidate path through the bracket
8. Per-participant ranking summaries where appropriate

### Match result to intent

A single winner is not always the best answer.

For planning, a shortlist is often better.

For groups, consensus may be better than raw popularity.

For recurring pools, history may be more useful than a single session's champion.

## Homepage Goals

The homepage has three jobs:

1. Explain what Brackeroni is
2. Let visitors try the matchup interaction quickly
3. Show how to start from a pool or import one

The homepage should make Brackeroni feel like a strange, sharp, playful decision tool, not a corporate SaaS dashboard.

### Recommended homepage hierarchy

1. Hero: make the product promise clear
2. Quick matchup: let the visitor feel the core interaction
3. Start from a pool: published pools as creation starting points
4. Product carousel: practical examples such as weekend plans, birthday activities, game night, or importing a guide
5. Importer: framed as a power move, not the main first-time concept

### Live voting

Live public matchups should be presented as a demo of the core interaction.

Prefer language like:

> Try a quick matchup

Avoid making live public voting feel like the whole product.

### Published pools

Published pools should feel like starting points for decisions.

Prefer language like:

> Start from a pool

The pool cards should use human-friendly pool names when possible, even if the source title is more awkward.

### Importer

The importer is strategically important because it turns existing web content into a Brackeroni pool.

It should be framed through real use cases:

1. Turn a weekend events article into a family decision
2. Turn a travel guide into an activity shortlist
3. Turn a ranking into a playable bracket
4. Turn a venue's activity page into a group plan

The importer should feel like a powerful secondary path, not an obscure technical feature.

## Algorithm Direction

The current product already supports bracket and ranking modes. Future decision-oriented modes should consider active pairwise ranking rather than strict round progression.

A practical future direction is:

1. Give each candidate a hidden score and uncertainty
2. Show informative pairwise comparisons
3. Focus comparisons near the boundary that matters for the session intent
4. Stop when the result is stable enough

For example, a shortlist mode should focus on determining the top tier rather than perfectly ordering the whole pool.

This does not need to be over-explained to users. The user-facing experience should remain simple:

> Take it one matchup at a time.

## Product Priorities

The most important product experiences are:

1. Create or import a pool quickly
2. Vote through matchups with almost no explanation
3. Invite a small group easily
4. Produce a satisfying result before voting feels like work
5. Reuse pools for future sessions
6. Show results that match the user's intent
7. Use public pools and live matchups as examples and starting points

## Design Implications

The look and feel should reinforce the product's decision-making character.

Brackeroni should feel decisive, readable, flat, sharp, and a little playful. It should not feel like a generic admin dashboard or a soft productivity app.

Design choices should support fast comparison:

1. Candidate names must be easy to read
2. Images should help the decision, not create chaos
3. Click targets should be obvious
4. The one-matchup-at-a-time flow should feel quick
5. Result screens should feel like a payoff
6. Primary actions should be visually clear

## Non-Goals

### Not primarily a public bracket site

Public brackets are useful for examples, discovery, and energy, but they are not the main product thesis.

### Not sports tournament management

Brackeroni is not primarily for managing real-world sports leagues, esports events, or formal competitions.

### Not a corporate prioritization platform

The same tradeoff logic applies to workplace prioritization, but Brackeroni should not become enterprise roadmap software by default.

That path would add organizational politics, integrations, facilitation workflows, and sales complexity. It may be philosophically relevant, but it is not the consumer product center.

### Not a perfect-ranking machine by default

Perfect ranking is a valid mode, but it should not be the default assumption.

Most users want a useful decision, not a mathematically complete ordering.

### Not an image-hosting platform

For MVP, Brackeroni should store external image URLs only. Images matter to the experience, but hosting images is not the product.

## Relationship to Existing Documents

### Domain document

The domain document remains the authority on entities, result modes, sharing modes, tournament behavior, vote behavior, and pool behavior.

This product-goals document explains why those concepts exist and how they should be used to shape product decisions.

### Architecture document

The architecture document remains the authority on implementation strategy.

This product-goals document should guide architectural choices when there are product tradeoffs, especially around synchronous rounds, aggregate modes, public surfaces, and future decision-oriented session types.

### Look and feel document

The look-and-feel document remains the authority on visual direction.

This product-goals document supplies the product reasoning behind that direction: Brackeroni should feel like a decisive, playful opinion machine because the product is about making choices feel manageable.

## Open Product Questions

1. How strongly should the create flow distinguish between winner, shortlist, group favorite, and full ranking modes?
2. When should the product introduce `pool` as vocabulary for a new user?
3. What is the simplest useful result view for a group planning decision?
4. How much voting is enough before a shortlist can be called stable?
5. Should public pools be treated mainly as templates, browseable content, or both?
6. How much importer behavior belongs on the homepage versus inside create flows?
7. Should recurring pools maintain history across sessions, and how should that history influence future decisions?
8. How should Brackeroni display consensus without making the product feel like dry analytics?
