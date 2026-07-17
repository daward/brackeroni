import { getCurrentUser } from "@/lib/auth/current-user";
import { isAdminUser } from "@/lib/auth/admin";
import { createPool, listPools } from "@/lib/data/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { buildGenericPageImportPrompt } from "@/lib/bookmarklets/prompt";
import { extractCandidatesWithGeminiForPools } from "@/lib/gemini/extract-pools-v2";
import { resolveCandidateSourceUrl } from "@/lib/source-url";
import { poolCreateSchema } from "@/lib/validation/pool";

export const GET = withRouteErrorHandling(async function GET(request) {
  const user = await getCurrentUser(request);
  const items = await listPools({ userId: user.id });

  return json({
    items,
    meta: {
      count: items.length
    }
  });
});

export const POST = withRouteErrorHandling(async function POST(request) {
  const user = await getCurrentUser(request);
  const payload = poolCreateSchema.parse(await readJson(request));
  let candidates = [];

  if (payload.source?.type === "extract") {
    const extractionSource = {
      ...payload.source,
      prompt:
        payload.source.prompt ||
        buildGenericPageImportPrompt({
          poolName: payload.name,
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
  } else if (payload.source?.type === "items") {
    candidates = payload.source.items.map((candidate) => ({
      name: candidate.name,
      description: candidate.description || null,
      imageUrl: candidate.imageUrl || null,
      sourceUrl: resolveCandidateSourceUrl(candidate.sourceUrl, payload.source.pageUrl || null),
      tags: candidate.tags || []
    }));
  }

  const pool = await createPool({
    creatorUserId: user.id,
    name: payload.name,
    description: payload.description,
    visibility: payload.visibility,
    candidates,
    importSourceUrl: payload.source?.type === "extract" ? payload.source.pageUrl || null : null,
    importSourceTitle: payload.source?.type === "extract" ? payload.source.pageTitle || null : null
  });

  return json(
    {
      item: pool
    },
    {
      status: 201
    }
  );
});
