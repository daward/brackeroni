import { getCurrentUser } from "@/lib/auth/current-user";
import { getPoolById, importCandidatesIntoPool, mergePoolIntoPool } from "@/lib/data/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { poolImportSchema } from "@/lib/validation/pool";
import { buildGenericPageImportPrompt } from "@/lib/bookmarklets/prompt";
import { extractCandidatesWithGeminiForPools } from "@/lib/gemini/extract-pools-v2";
import { resolveCandidateSourceUrl } from "@/lib/source-url";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  const payload = poolImportSchema.parse(await readJson(request));
  const pool = await getPoolById({ poolId, userId: user.id });

  if ("sourcePoolId" in payload) {
    const pool = await mergePoolIntoPool({
      poolId,
      sourcePoolId: payload.sourcePoolId,
      creatorUserId: user.id
    });

    return json({ item: pool });
  }

  let candidates = [];

  if (payload.source.type === "extract") {
    const extractionSource = {
      ...payload.source,
      prompt:
        payload.source.prompt ||
        buildGenericPageImportPrompt({
          pageTitle: payload.source.pageTitle,
          pageUrl: payload.source.pageUrl
        })
    };
    const extracted = await extractCandidatesWithGeminiForPools(extractionSource);
    candidates = extracted.candidates.map((candidate) => ({
      name: candidate.label,
      description: candidate.description || null,
      imageUrl: candidate.imageUrl || null,
      sourceUrl: resolveCandidateSourceUrl(candidate.sourceUrl, payload.source.pageUrl || null),
      tags: candidate.tags || []
    }));
  } else {
    candidates = payload.source.items.map((candidate) => ({
      name: candidate.name,
      description: candidate.description || null,
      imageUrl: candidate.imageUrl || null,
      sourceUrl: resolveCandidateSourceUrl(candidate.sourceUrl, pool.importSourceUrl || null),
      tags: candidate.tags || []
    }));
  }

  const result = await importCandidatesIntoPool({
    poolId,
    creatorUserId: user.id,
    candidates
  });

  return json({
    item: {
      ...result.pool,
      importSourceUrl: result.pool.importSourceUrl || pool.importSourceUrl || null,
      importSourceTitle: result.pool.importSourceTitle || pool.importSourceTitle || null
    },
    meta: {
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      importedNames: result.importedNames,
      skippedNames: result.skippedNames
    }
  });
});
