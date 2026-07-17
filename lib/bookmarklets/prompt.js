export function buildGenericPageImportPrompt({ poolName, pageTitle, pageUrl, extraInstructions }) {
  const targetPool = poolName?.trim() ? `"${poolName.trim()}"` : "this pool";
  const titleClause = pageTitle?.trim() ? `The page title is "${pageTitle.trim()}".` : "";
  const urlClause = pageUrl?.trim() ? `The page URL is ${pageUrl.trim()}.` : "";
  const extraClause = extraInstructions?.trim()
    ? `Additional import instructions: ${extraInstructions.trim()}`
    : "";

  return [
    `Extract candidates for ${targetPool} from the provided page content.`,
    "Be exhaustive rather than selective.",
    "Return distinct candidate entities explicitly supported by the page.",
    "Prefer canonical names over aliases or variants.",
    "Use short descriptions derived from the page content, not meta commentary about extraction.",
    "Ignore navigation, ads, boilerplate, account controls, and unrelated page chrome.",
    "If the page is a ranked list, history page, review page, directory, category page, or article roundup, treat each relevant item as a candidate.",
    "If the page is a grid, feed, gallery, channel, or repeated card layout, treat each repeated content card as a candidate when it represents a distinct item.",
    "If the HTML contains repeated <article data-brackeroni-card=\"true\"> elements, each article is intended to represent one candidate card.",
    "For those Brackeroni cards, treat the <h3> text as the candidate name, preserve the associated href as the source URL when present, and preserve the associated img src as the image URL when present.",
    "If a candidate card includes short metadata labels such as category, neighborhood, open or closed status, ticket price, badges, or award labels, return them as candidate tags whenever they are candidate-specific.",
    "Do not collapse multiple Brackeroni cards into a smaller summary. Work card-by-card and be exhaustive.",
    "When highlighted content is provided, prioritize the highlighted content over the rest of the page.",
    titleClause,
    urlClause,
    extraClause
  ]
    .filter(Boolean)
    .join(" ");
}
