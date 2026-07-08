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

## Borders and Lines

1. Rules should be crisp and slightly visible; faint lines that disappear are useless.
2. Yellow should not be wasted on passive structure lines.
3. Use stronger line contrast when the line is meant to organize reading.
4. Use fewer lines overall when the content is already visually separated by spacing or imagery.

# Color

The palette should stay dark with sharp contrast and clear color jobs.

1. Yellow is for primary action and high-importance calls to act.
2. Cyan is for active state, current state, selection, focus, and information accents.
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

If a pattern appears more than once, give it a real name.
