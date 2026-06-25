export function buildGenericPageImportPrompt({ poolName, pageTitle, pageUrl }) {
  const targetPool = poolName?.trim() ? `"${poolName.trim()}"` : "this pool";
  const titleClause = pageTitle?.trim() ? `The page title is "${pageTitle.trim()}".` : "";
  const urlClause = pageUrl?.trim() ? `The page URL is ${pageUrl.trim()}.` : "";

  return [
    `Extract candidates for ${targetPool} from the provided page content.`,
    "Be exhaustive rather than selective.",
    "Return distinct candidate entities explicitly supported by the page.",
    "Prefer canonical names over aliases or variants.",
    "Use short descriptions derived from the page content, not meta commentary about extraction.",
    "Ignore navigation, ads, boilerplate, account controls, and unrelated page chrome.",
    "If the page is a ranked list, history page, review page, directory, category page, or article roundup, treat each relevant item as a candidate.",
    titleClause,
    urlClause
  ]
    .filter(Boolean)
    .join(" ");
}
