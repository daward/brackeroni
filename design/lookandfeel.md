Overall style should be flat, sharp, and a little playful. This is not a corporate dashboard. It should feel more like a strange little opinion paper than a SaaS admin tool.

# Core Direction

1. The site should feel closer to a newspaper or magazine layout than a boxed app shell.
2. Lines, spacing, and hierarchy should do more work than filled panels and heavy borders.
3. The product is about making choices. The UI should feel decisive and readable, not soft or decorative.
4. The dark theme should feel intentional, not muddy. Use charcoal and warm near-black surfaces rather than pure black everywhere.

# Visual System

## Layout

1. Favor horizontal rules and section spacing over stacking a lot of heavy boxes.
2. Double-line separators are good for major section breaks, but they need visible breathing room between the two rules.
3. Vertical dividers should be used sparingly. They easily make the page feel cramped.
4. Important columns should have enough negative space between them to feel independent.
5. The page background should be slightly lighter than the darkest panels so sections can separate cleanly.

## Surfaces

1. Not every region needs to look like a card.
2. The hero area especially should feel more open and less boxed in.
3. Utility panels such as the importer callout can have a stronger outline, but avoid gradients and soft glows.
4. Filled panels should be reserved for actual content containers, not every heading band.

## Card Families

Cards should be recognizable by product role, not by whichever feature happened to build them first. If a card looks and behaves like an existing family, use that family's shared CSS contract rather than restating its border, hover, title, metadata, and copy rules locally.

1. **List object cards** are for browsable bracket, pool, and voting lists. They should share an object-list style contract: strong title, quiet metadata, readable serif copy, one clear primary click target, and consistent hover/focus behavior. On mobile management pages, this family becomes rule-separated rows on the open canvas.
2. **Choice cards** are for configuration decisions such as bracket style, result mode, source, access, and versus choices. They use selection state as the main visual signal. Hover should stay minimal and must never compete with selected state.
3. **Image cards** are for content where imagery carries recognition: completed bracket cards, public pool previews, home matchup cards, and voting candidate cards. These may have stronger image-specific layouts, but title/meta/copy hierarchy should still follow the same type roles.
4. **History/detail cards** are for results, progress, score history, and round summaries. They can be denser and quieter than list cards because they support reading and comparison rather than primary navigation.
5. **Utility panels** are for temporary or operational surfaces such as importer callouts, waiting rooms, modals, drawers, and save status panels. They may use stronger outlines, but they should not quietly become another list-card style.

When a new card does not clearly fit one of these families, update this list before introducing the new pattern.

## Borders and Lines

1. Rules should be crisp and slightly visible; faint lines that disappear are useless.
2. Yellow should not be wasted on passive structure lines.
3. Use stronger line contrast when the line is meant to organize reading.
4. Use fewer lines overall when the content is already visually separated by spacing or imagery.

# Color

The palette should stay dark with sharp contrast and clear color jobs.

1. Yellow is for the one primary action and the currently selected top-level/stage tab.
2. Cyan is for secondary actions, focus, selection within content, and information accents.
3. White or warm off-white is for the main content voice.
4. Muted gray-brown tones are for supporting labels and structural copy.
5. Red should be rare and should usually mean negative outcome or voted-against state.

Do not let everything compete with the same bright white text. The page should have a clear reading order.

# Typography

The typography should stay strict.

## Role Split

1. Sans serif owns interface, labels, controls, and strong headings.
2. Serif owns reading copy and supportive explanatory text.
3. Condensed sans is the product's strong voice and should be used deliberately.

## Use the condensed sans for

1. Navigation
2. Buttons
3. Form controls
4. Section headings
5. Counts, badges, chips, and state labels
6. Editable titles and clearly interactive text
7. Matchup titles and major bracket names

## Use the serif for

1. Descriptions
2. Helper copy
3. Empty-state explanations
4. Candidate and bracket supporting copy that is meant to be read, not clicked

## Hierarchy Rules

1. Do not let too many headings share the same size, weight, and color.
2. Column headings should be visibly different from card titles.
3. Metadata should stay quieter than the object it describes.
4. If two adjacent statements compete, one of them is probably too loud.

## Case Rules

Use uppercase selectively.

Good uses:

1. Main navigation
2. Primary buttons
3. Small badges and section markers
4. Kicker labels

Avoid all-caps for:

1. Long copy
2. Most field content
3. Candidate names
4. Bracket titles

# Interaction Design

1. Clickable areas must feel clickable.
2. If only part of a large area is clickable, that is usually a design bug.
3. Hover states should emphasize the thing being hovered, not nearby siblings.
4. Editing state should be obvious and should calm down again when editing is finished.
5. Draft editing should feel persistent and safe, but not permanently expanded.

## Hover And Selection

A hover rule is a design contract, not a decoration. "Define a rule" means both documenting the expected behavior here and implementing it in shared CSS where the pattern is shared. Features should not locally invent hover behavior for shared card, list, tab, or choice patterns.

1. Hover may clarify clickability, but it should not create a second visual meaning.
2. Selected, active, disabled, loading, and error states always win over hover.
3. Hover must not dim, remove, or visually contradict the current selected state.
4. List object cards may use a small border/background/title-color shift on hover and focus-visible. Use the shared list-card contract when available.
5. Choice cards should use selection as the main signal. Unselected hover should be subtle; selected hover should preserve the selected border and fill.
6. Management rows on mobile should not gain heavy hover treatments. Touch-first list rows need clear actions and spacing more than desktop hover drama.
7. Image cards may animate imagery slightly on hover only when it helps recognition and does not cause layout shift.

## Buttons

1. Save the strongest yellow treatment for the primary action.
2. Secondary buttons should not shout.
3. Avoid giant isolated buttons when the whole card or section can serve as the action.
4. Button groups should feel aligned and intentional, not like a pile of unrelated controls.

## Mobile Patterns

1. Mobile should reduce vertical drag wherever possible.
2. Accordions are preferred over long repeated stacks when the user already understands the section labels.
3. Carousels should behave like normal swipeable mobile rails, not faux carousels with awkward desktop controls.
4. Indicators for swipeable content should be subtle and familiar. Dots are usually better than clumsy arrows.

## Pagination And Loading

Pagination should be simple, shared, and nearly invisible. Infinite scrolling should not become a feature-specific behavior unless the product interaction is genuinely different.

1. Offset-paginated lists should use the shared pagination collection contract rather than local offset refs and bespoke duplicate filtering.
2. Infinite-scroll sentinels should use the shared infinite-scroll control. Feature components may pass a semantic class for spacing, but not reimplement the observer.
3. Loading more items should preserve the existing list layout. Do not insert a large card, modal, or yellow action just to load the next page.
4. Page size, offset, and `hasNextPage` handling should live in the feature data hook or shared pagination hook, not inside card components.
5. When pagination appears in brackets, pools, voting, and candidates, the user should experience the same loading rhythm and the same quiet sentinel behavior.

### Approved create-workspace reference

Treat the current mobile Brackets workspace as the reference composition for management/list pages.

1. The wordmark and page content share the same left gutter. Do not add a second inset inside the header.
2. On mobile, desktop navigation collapses to an icon-only hamburger in the top-right; do not add a separate full-width "Menu" control.
3. Brackets and Pools are compact text tabs with an underline, not stacked black navigation cards. Supporting descriptions are hidden on mobile.
4. Drafts, Live, and Completed remain compact rectangular stage tabs. The selected stage is filled yellow; inactive stages are quiet outlined controls.
5. Lists live directly on the open charcoal canvas. Individual rows are separated by rules, not wrapped in dark cards or a large empty black slab.
6. Each row has a small cyan-outline continuation action and quieter outlined secondary actions. Do not repeat filled-yellow row actions.
7. A single create action on a list page is an icon-only, yellow floating action button in the bottom-right on mobile. Its desktop counterpart may live in the relevant tab/action row, but it must not appear as a duplicate on mobile.
8. Before shipping a mobile management page, check: shared gutter, no redundant navigation controls, one yellow hierarchy signal per local group, and no unexplained filled panels.

## Workflow Pages

Multi-step creation and editing flows are pages, not modals stretched to fit a route.

1. Use the normal page canvas and page hierarchy; do not center a bordered dialog inside it.
2. A route must have destination-aware navigation such as "Back to Brackets." Never label route navigation "Close."
3. Keep step navigation, content, and actions in the normal reading flow. Sticky actions are acceptable when they improve mobile reachability, but modal-style fixed shells are not.
4. Reuse the established type roles, rules, spacing, and button hierarchy before adding a new pattern.
5. Before handing off UI work, check the desktop and mobile composition against this document. If a new pattern is needed, document why rather than silently introducing it.

# Imagery

1. Images are often inconsistent in quality and aspect ratio, so the UI must handle that gracefully.
2. Large images should fill the frame more aggressively when the source supports it.
3. Small images should not simply stretch. Use a matching backdrop or contained treatment.
4. If an image is missing, do not reserve a giant empty image slot.
5. In voting contexts, imagery should help comparison quickly, not create layout chaos.

# Homepage Guidance

The home page has three jobs:

1. Explain what Brackeroni is
2. Show live voting immediately
3. Show how to start from a published pool or imported list

Guidelines:

1. The live voting rail should feel like the best quick demo of the product.
2. The published pools rail should feel like the clearest creation entry point.
3. The bookmarklet importer is important, but it should read as a power move, not the main first-time CTA.
4. On mobile, the hero should compress aggressively and the swipeable featured content should do more of the explanatory work.

# CSS Implementation Guidance

This is not just a visual preference; it is a maintainability rule.

1. Prefer semantic, reusable CSS classes for page sections and recurring components.
2. Do not build entire screens out of giant one-off `className` strings.
3. Do not rely on opaque hashed CSS-module names as the main vocabulary for shared design patterns.
4. Shared patterns should live in understandable class names such as rails, headers, cards, matchup blocks, and utility button variants.
5. Utilities are fine for small local adjustments, but the design language should be readable from the class names alone.
6. Prefer shared CSS contracts for recurring visual objects over a single overgeneralized React component. For example, list cards can share classes for shell, title, meta, copy, action, selected, disabled, and hover states while still being rendered by feature-owned components.
7. CSS modules are appropriate for feature-only layout, but recurring typography, card, list, rail, tab, button, pagination, and state behavior should graduate to named shared classes.
8. Arbitrary Tailwind values in JSX are allowed only for genuinely one-off mechanical adjustments. If the value expresses color, type hierarchy, card shape, list spacing, hover behavior, or responsive structure, give it a semantic class.
9. If a feature needs to break a shared pattern, leave a short reason in the design doc or nearby code. Silent divergence is how the product starts to feel incoherent.

If a pattern appears more than once, give it a real name.
