import { brackets, parallelBrackets } from "@/lib/brackets";
import { generateCandidatesWithGemini } from "@/lib/gemini/generate-candidates";
import { planBracketIntentWithGemini } from "@/lib/gemini/plan-bracket-intent";
import { createPool, listPools, listPublicPools } from "@/lib/pools";
import { bracketIntentPlanSchema } from "@/lib/validation/bracket-intent";
import type { BracketIntentPresetId } from "@/lib/brackets/intent-presets";
import type {
  Bracket,
  BracketAdvancementMode,
  BracketResultMode,
  BracketSharingMode,
  BracketTieBreakMode,
  BracketVisibility
} from "@/lib/brackets/types";
import type { PoolCandidateInput, PoolSelectionOption, PublicPool } from "@/lib/pools/types";

type PromptPool = PoolSelectionOption & {
  visibility?: "private" | "public_listed" | "public_unlisted";
  isOwned?: boolean;
};

type ModelIntentPlan = {
  title?: string | null;
  poolName?: string | null;
};

type CandidateSourcePlan =
  | { type: "existing_owned_pool"; poolId: string }
  | { type: "existing_published_pool"; poolId: string }
  | { type: "new_pool_from_items"; poolName: string; candidates: PoolCandidateInput[] }
  | {
      type: "new_pool_from_generation";
      poolName: string;
      candidateCount: number;
      prompt: string;
      includeImages: boolean;
    };

export type BracketIntentPlan = {
  title: string;
  description: string | null;
  source: CandidateSourcePlan;
  sharingMode: BracketSharingMode;
  visibility: BracketVisibility;
  votingAccess: "signed_in_only" | "anyone";
  playStyle: "fixed_bracket" | "reseed";
  resultMode: BracketResultMode;
  tieBreakMode: BracketTieBreakMode;
  advancementMode: BracketAdvancementMode;
  intentPreset: BracketIntentPresetId | null;
};

export type BracketIntentPreview = {
  plan: BracketIntentPlan;
  sourceSummary: string;
  safety: {
    startsAutomatically: false;
    publishesAutomatically: false;
    createsPrivatePoolByDefault: true;
  };
  matchedPools: Array<{
    id: string;
    name: string;
    candidateCount?: number | null;
    visibility?: string | null;
  }>;
};

const DEFAULT_GENERATED_CANDIDATE_COUNT = 16;
const MAX_TITLE_LENGTH = 120;

export async function previewBracketIntent({
  creatorUserId,
  prompt
}: {
  creatorUserId: string;
  prompt: string;
}): Promise<BracketIntentPreview> {
  const availablePools = await listIntentPools({ creatorUserId, prompt });
  const modelPlan = await getModelIntentPlan(prompt);
  const plan = buildPromptPlan({ prompt, availablePools, modelPlan });

  return {
    plan,
    sourceSummary: summarizeSource(plan, availablePools),
    safety: {
      startsAutomatically: false,
      publishesAutomatically: false,
      createsPrivatePoolByDefault: true
    },
    matchedPools: availablePools
      .filter((pool) => pool.id === getPlanPoolId(plan))
      .map((pool) => ({
        id: pool.id,
        name: pool.name,
        candidateCount: pool.candidateCount,
        visibility: pool.visibility ?? null
      }))
  };
}

export async function createBracketFromPrompt({
  creatorUserId,
  prompt
}: {
  creatorUserId: string;
  prompt: string;
}): Promise<{ item: Bracket; plan: BracketIntentPlan; sourceSummary: string }> {
  const preview = await previewBracketIntent({ creatorUserId, prompt });
  const sourcePoolId = await resolveSourcePoolId({ creatorUserId, plan: preview.plan });
  const createPayload = {
    title: preview.plan.title,
    description: preview.plan.description,
    sourcePoolId,
    sharingMode: preview.plan.sharingMode,
    visibility: preview.plan.visibility,
    votingAccess: preview.plan.votingAccess,
    tieBreakMode: preview.plan.tieBreakMode,
    intentPreset: preview.plan.intentPreset
  };
  const item = isParallelResultMode(preview.plan.resultMode)
    ? await parallelBrackets({ creatorUserId }).create({
        ...createPayload,
        resultMode: preview.plan.resultMode
      })
    : await brackets({ creatorUserId }).create({
        ...createPayload,
        playStyle: preview.plan.playStyle,
        resultMode: preview.plan.resultMode,
        advancementMode: preview.plan.advancementMode
      });

  return {
    item,
    plan: preview.plan,
    sourceSummary: preview.sourceSummary
  };
}

async function listIntentPools({
  creatorUserId,
  prompt
}: {
  creatorUserId: string;
  prompt: string;
}): Promise<PromptPool[]> {
  const [owned, published] = await Promise.all([
    listPools({ userId: creatorUserId, limit: 48, offset: 0 }),
    listPublicPools({ userId: creatorUserId, query: extractPoolSearchQuery(prompt), limit: 12, offset: 0 })
  ]);
  const pools = [
    ...owned.items.map((pool) => ({ ...pool, isOwned: true })),
    ...published.map((pool) => ({
      id: pool.favoritePoolId || pool.id,
      name: pool.name,
      description: pool.description,
      candidateCount: pool.candidateCount,
      visibility: "public_listed" as const,
      isOwned: false
    }))
  ];

  return pools.filter((pool, index, all) => all.findIndex((candidate) => candidate.id === pool.id) === index);
}

function buildPromptPlan({
  prompt,
  availablePools,
  modelPlan = null
}: {
  prompt: string;
  availablePools: PromptPool[];
  modelPlan?: ModelIntentPlan | null;
}): BracketIntentPlan {
  const matchedPools = findMatchingPools(prompt, availablePools, modelPlan);

  if (matchedPools.length > 1) {
    throw new Error("BRACKET_INTENT_AMBIGUOUS_POOL");
  }

  const title = inferTitle(prompt, matchedPools[0], modelPlan);
  const source = matchedPools[0]
    ? sourceFromPool(matchedPools[0])
    : sourceFromPrompt(prompt, title, modelPlan);
  const plan = {
    title,
    description: null,
    source,
    sharingMode: inferSharingMode(prompt),
    visibility: inferVisibility(prompt),
    votingAccess: inferVotingAccess(prompt),
    playStyle: inferPlayStyle(prompt),
    resultMode: inferResultMode(prompt),
    tieBreakMode: inferTieBreakMode(prompt),
    advancementMode: inferAdvancementMode(prompt),
    intentPreset: null
  };

  return enforcePromptSafety(bracketIntentPlanSchema.parse(plan) as BracketIntentPlan);
}

function sourceFromPool(pool: PromptPool): CandidateSourcePlan {
  return pool.isOwned
    ? { type: "existing_owned_pool", poolId: pool.id }
    : { type: "existing_published_pool", poolId: pool.id };
}

async function getModelIntentPlan(prompt: string): Promise<ModelIntentPlan | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  try {
    return await planBracketIntentWithGemini({
      prompt,
      model: undefined
    });
  } catch (error) {
    if (error instanceof Error && error.message === "GEMINI_API_KEY_NOT_SET") {
      return null;
    }

    return null;
  }
}

function sourceFromPrompt(
  prompt: string,
  fallbackName: string,
  modelPlan: ModelIntentPlan | null = null
): CandidateSourcePlan {
  const explicitCandidates = parseExplicitCandidates(prompt);
  const poolName = cleanPoolName(modelPlan?.poolName || fallbackName);

  if (explicitCandidates.length >= 2) {
    return {
      type: "new_pool_from_items",
      poolName,
      candidates: explicitCandidates
    };
  }

  return {
    type: "new_pool_from_generation",
    poolName,
    candidateCount: inferCandidateCount(prompt),
    prompt,
    includeImages: !/\b(no images?|without images?)\b/i.test(prompt)
  };
}

async function resolveSourcePoolId({
  creatorUserId,
  plan
}: {
  creatorUserId: string;
  plan: BracketIntentPlan;
}): Promise<string> {
  if (plan.source.type === "existing_owned_pool" || plan.source.type === "existing_published_pool") {
    return plan.source.poolId;
  }

  if (plan.source.type === "new_pool_from_items") {
    const pool = await createPool({
      creatorUserId,
      name: plan.source.poolName,
      description: null,
      visibility: "private",
      candidates: plan.source.candidates
    });

    return pool.id;
  }

  const generated = await generateCandidatesWithGemini({
    count: plan.source.candidateCount,
    includeImages: plan.source.includeImages,
    prompt: buildCandidateGenerationPrompt(plan),
    model: undefined
  });

  if (generated.candidates.length < 2) {
    throw new Error("BRACKET_INTENT_NOT_ENOUGH_CANDIDATES");
  }

  const pool = await createPool({
    creatorUserId,
    name: plan.source.poolName,
    description: null,
    visibility: "private",
    candidates: generated.candidates
  });

  return pool.id;
}

function buildCandidateGenerationPrompt(plan: BracketIntentPlan): string {
  return [
    `Create candidates for this bracket: ${plan.title}.`,
    "Use the user's full request as the source of truth.",
    "Generate concrete candidates that would make sense in a head-to-head preference bracket.",
    "",
    "User request:",
    plan.source.type === "new_pool_from_generation" ? plan.source.prompt : plan.title
  ].join("\n");
}

function enforcePromptSafety(plan: BracketIntentPlan): BracketIntentPlan {
  const explicitlyPublic = plan.visibility === "public_listed" || plan.visibility === "public_unlisted";

  return {
    ...plan,
    visibility: explicitlyPublic ? plan.visibility : "private",
    votingAccess: explicitlyPublic ? plan.votingAccess : "signed_in_only",
    // Prompt-created brackets are always created as drafts by the persistence layer.
  };
}

function findMatchingPools(
  prompt: string,
  pools: PromptPool[],
  modelPlan: ModelIntentPlan | null = null
): PromptPool[] {
  const normalizedPrompt = normalizeSearchText(prompt);
  const referencedPoolText = extractReferencedPoolText(prompt);
  const normalizedReference = normalizeSearchText(referencedPoolText);
  const modelSearchText = normalizeSearchText(`${modelPlan?.title || ""} ${modelPlan?.poolName || ""}`);
  const promptTokens = getSearchTokens(`${normalizedPrompt} ${modelSearchText}`);
  const referenceTokens = getSearchTokens(normalizedReference);
  const matches = pools.filter((pool) => {
    const normalizedName = normalizeSearchText(pool.name);

    return normalizedName && (
      normalizedPrompt.includes(normalizedName) ||
      modelSearchText.includes(normalizedName) ||
      (normalizedReference && normalizedName.includes(normalizedReference)) ||
      hasPoolTokenMatch(normalizedName, promptTokens) ||
      (referenceTokens.size > 0 && hasPoolTokenMatch(normalizedName, referenceTokens))
    );
  });

  return matches.sort((left, right) => Number(Boolean(right.isOwned)) - Number(Boolean(left.isOwned)));
}

function hasPoolTokenMatch(normalizedPoolName: string, searchTokens: Set<string>) {
  const poolTokens = getSearchTokens(normalizedPoolName);

  if (poolTokens.size === 0) {
    return false;
  }

  return [...poolTokens].every((token) => searchTokens.has(token));
}

function extractReferencedPoolText(prompt: string): string {
  const match = prompt.match(/\b(?:use|from|with|using)\s+(?:my\s+|the\s+)?(.{2,80}?)\s+pool\b/i);

  return match?.[1] || "";
}

function extractPoolSearchQuery(prompt: string): string {
  return extractReferencedPoolText(prompt) || prompt.slice(0, 80);
}

function parseExplicitCandidates(prompt: string): PoolCandidateInput[] {
  const match = prompt.match(/\b(?:between|among|including|with)\b\s*:?\s+(.+)$/i);
  const listText = match?.[1] || "";

  if (!listText || !/[,\n;]/.test(listText)) {
    return [];
  }

  const blockedSettingWords = /\b(full ranking|winner|private|public|friends|random|reseed|fixed|bracket)\b/i;
  const names = listText
    .split(/[,\n;]/)
    .map((value) => value.replace(/\band\s+/i, "").trim())
    .filter((value) => value.length > 0 && value.length <= 120 && !blockedSettingWords.test(value));

  return [...new Set(names)].slice(0, 1000).map((name) => ({
    name,
    description: null,
    imageUrl: null,
    tags: []
  }));
}

function inferTitle(
  prompt: string,
  pool: PromptPool | null = null,
  modelPlan: ModelIntentPlan | null = null
): string {
  const namedMatch = prompt.match(/\b(?:called|named|title(?:d)?)\s+["']?([^"'.]+)["']?/i);

  if (namedMatch?.[1]) {
    return cleanTitle(namedMatch[1]);
  }

  if (pool) {
    return cleanTitle(`${pool.name} Bracket`);
  }

  if (modelPlan?.title) {
    return cleanTitle(modelPlan.title);
  }

  const subjectMatch = prompt.match(/\b(?:for|of|about)\s+(.+?)(?:\s+(?:with|using|that|and|full|winner|private|public)\b|$)/i);
  return cleanTitle(subjectMatch?.[1] || prompt);
}

function cleanTitle(value: string): string {
  const title = value
    .replace(/\b(make|create|build|a|an|the|bracket|pool|list)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const fallback = title || "New Bracket";
  const normalized = fallback.endsWith("Bracket") ? fallback : `${fallback} Bracket`;

  return normalized.slice(0, MAX_TITLE_LENGTH);
}

function cleanPoolName(value: string): string {
  return cleanTitle(value).replace(/\s+Bracket$/i, "").trim().slice(0, MAX_TITLE_LENGTH) || "New Pool";
}

function inferCandidateCount(prompt: string): number {
  const countMatch = prompt.match(/\b(\d{1,3})\s+(?:candidates|options|items|contenders|restaurants|movies|songs|teams|places)\b/i);
  const topMatch = prompt.match(/\btop\s+(\d{1,3})\b/i);
  const count = Number.parseInt(countMatch?.[1] || topMatch?.[1] || "", 10);

  if (Number.isInteger(count) && count >= 2) {
    return Math.min(count, 100);
  }

  return DEFAULT_GENERATED_CANDIDATE_COUNT;
}

function inferSharingMode(prompt: string): BracketSharingMode {
  return /\b(friends?|friend group|family|household|group|invite|invited)\b/i.test(prompt)
    ? "with_friends"
    : "private";
}

function inferVisibility(prompt: string): BracketVisibility {
  if (/\b(public listed|listed public|publish(?:ed)? and listed)\b/i.test(prompt)) {
    return "public_listed";
  }

  if (/\b(public unlisted|unlisted|public link)\b/i.test(prompt)) {
    return "public_unlisted";
  }

  return "private";
}

function inferVotingAccess(prompt: string): "signed_in_only" | "anyone" {
  return /\b(anyone can vote|anonymous voting|vote by anyone|public voting)\b/i.test(prompt)
    ? "anyone"
    : "signed_in_only";
}

function inferPlayStyle(prompt: string): "fixed_bracket" | "reseed" {
  return /\b(reseed|re-seed|reseeding)\b/i.test(prompt) ? "reseed" : "fixed_bracket";
}

function hasExplicitWinnerIntent(prompt: string) {
  return /\b(winner bracket|single winner|one winner|1 winner|pick one|single champion|champion|single best option|one best option)\b/i.test(prompt);
}

function inferResultMode(prompt: string): BracketResultMode {
  const explicitWinnerIntent = hasExplicitWinnerIntent(prompt);

  if (/\bparallel\b/i.test(prompt) && /\bpartial|top half|shortlist\b/i.test(prompt)) {
    return "parallel_partial_ranking";
  }

  if (
    /\bparallel|everyone gets their own|each person|everyone ranks|compare everyone'?s picks|consensus\b/i.test(prompt) ||
    (/\b(family|friends?|group|household)\b/i.test(prompt) && /\b(agrees?|agree on|agreed|consensus|everyone'?s picks|everyone ranks)\b/i.test(prompt))
  ) {
    if (explicitWinnerIntent) {
      return "winner_only";
    }

    return "parallel_full_ranking";
  }

  if (/\bfast|swiss\b/i.test(prompt)) {
    return "fast_full_rank";
  }

  if (/\bpartial|top half|shortlist\b/i.test(prompt)) {
    return "partial_ranking";
  }

  if (/\bfull rank|full ranking|rank everything|rank all|complete ranking\b/i.test(prompt)) {
    return "full_ranking";
  }

  return "winner_only";
}

function inferTieBreakMode(prompt: string): BracketTieBreakMode {
  return /\brandom tie|random tiebreak|coin flip\b/i.test(prompt) ? "random" : "higher_seed_wins";
}

function inferAdvancementMode(prompt: string): BracketAdvancementMode {
  return /\bmanual winner|manual advancement|i'?ll pick winners\b/i.test(prompt)
    ? "manual_winner"
    : "vote_winner";
}

function isParallelResultMode(resultMode: BracketResultMode): resultMode is "parallel_full_ranking" | "parallel_partial_ranking" {
  return resultMode === "parallel_full_ranking" || resultMode === "parallel_partial_ranking";
}

function getPlanPoolId(plan: BracketIntentPlan): string | null {
  return plan.source.type === "existing_owned_pool" || plan.source.type === "existing_published_pool"
    ? plan.source.poolId
    : null;
}

function summarizeSource(plan: BracketIntentPlan, pools: PromptPool[]): string {
  const poolId = getPlanPoolId(plan);
  const pool = poolId ? pools.find((item) => item.id === poolId) : null;

  if (pool) {
    return `Uses ${pool.name}`;
  }

  if (plan.source.type === "new_pool_from_items") {
    return `Creates a private pool with ${plan.source.candidates.length} candidates`;
  }

  if (plan.source.type === "new_pool_from_generation") {
    return `Generates ${plan.source.candidateCount} candidates into a private pool`;
  }

  return "Creates a private pool";
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getSearchTokens(value: string) {
  return new Set(
    normalizeSearchText(value)
      .split(/\s+/)
      .map(normalizeSearchToken)
      .filter((token) => token.length >= 3 && !poolSearchStopWords.has(token))
  );
}

function normalizeSearchToken(value: string) {
  if (value.endsWith("ies") && value.length > 4) {
    return `${value.slice(0, -3)}y`;
  }

  if (value.endsWith("s") && value.length > 3) {
    return value.slice(0, -1);
  }

  return value;
}

const poolSearchStopWords = new Set([
  "bracket",
  "candidate",
  "contender",
  "item",
  "list",
  "option",
  "pool",
  "ranking"
]);

export const __testing = {
  buildPromptPlan,
  enforcePromptSafety,
  findMatchingPools,
  inferResultMode,
  parseExplicitCandidates
};
