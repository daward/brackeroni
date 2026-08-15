import { getCurrentUser } from "@/lib/auth/current-user";
import { isAdminUser } from "@/lib/auth/admin";
import { createPool, listPools } from "@/lib/data/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { takeRequestRateLimit } from "@/lib/api/request-rate-limit";
import { buildGenericPageImportPrompt } from "@/lib/bookmarklets/prompt";
import { extractCandidatesWithGeminiForPools } from "@/lib/gemini/extract-pools-v2";
import { resolveCandidateSourceUrl } from "@/lib/source-url";
import { poolCreateSchema } from "@/lib/validation/pool";

export const GET = withRouteErrorHandling(async function GET(request) {
  const user = await getCurrentUser(request);
  const rateLimit = takeRequestRateLimit({
    key: `workspace-list:pools:${user.id}`
  });

  if (!rateLimit.allowed) {
    return json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many workspace refreshes. Try again in a moment."
        }
      },
      {
        status: 429,
        headers: {
          "retry-after": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }
  const limit = request.nextUrl.searchParams.get("limit");
  const offset = request.nextUrl.searchParams.get("offset");

  if (limit == null) {
    return json(
      {
        error: {
          code: "PAGINATION_REQUIRED",
          message: "A bounded limit is required when listing pools."
        }
      },
      { status: 400 }
    );
  }

  const parsedLimit = Number.parseInt(limit, 10);
  const parsedOffset = offset == null ? 0 : Number.parseInt(offset, 10);

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 50 ||
    !Number.isInteger(parsedOffset) ||
    parsedOffset < 0
  ) {
    return json(
      {
        error: {
          code: "INVALID_PAGINATION",
          message: "limit must be between 1 and 50, and offset must be zero or greater."
        }
      },
      { status: 400 }
    );
  }

  const result = await listPools({
    userId: user.id,
    limit: parsedLimit,
    offset: parsedOffset
  });

  return json({
    items: result.items,
    meta: {
      count: result.items.length,
      totalCount: result.totalCount,
      limit: result.limit,
      offset: result.offset,
      hasNextPage:
        result.limit != null && result.offset + result.items.length < result.totalCount
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
