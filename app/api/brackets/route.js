import { cookies } from "next/headers";
import { getCurrentUser, getOptionalCurrentUser } from "@/lib/auth/current-user";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import {
  bracketDirectory,
  brackets,
  parallelBracketDirectory
} from "@/lib/brackets";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { takeRequestRateLimit } from "@/lib/api/request-rate-limit";
import { tournamentCreateSchema } from "@/lib/validation/tournament";

export const GET = withRouteErrorHandling(async function GET(request) {
  const { searchParams } = request.nextUrl;
  const scope = searchParams.get("scope");
  const directory = bracketDirectory();
  const parallelDirectory = parallelBracketDirectory();

  if (scope === "vote-completed") {
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "12", 10);

    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 24) {
      return json(
        { error: { code: "INVALID_PAGINATION", message: "offset must be zero or greater and limit must be 1-24." } },
        { status: 400 }
      );
    }

    const user = await getOptionalCurrentUser();
    const cookieStore = await cookies();
    const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;
    // Each source may overlap (for example, a creator's public bracket). Fetching
    // one additional item leaves room for deduplication without returning a huge list.
    const sourceLimit = limit + 1;
    const [accessible, publicItems, accessibleParallel, publicParallel] = await Promise.all([
      user
        ? directory.listAccessibleBrackets({ userId: user.id, statuses: ["complete"], limit: sourceLimit, offset })
        : Promise.resolve([]),
      directory.listPublicBrackets({ statuses: ["complete"], limit: sourceLimit, offset }),
      user
        ? parallelDirectory.listAccessibleBrackets({
            userId: user.id,
            anonymousVoterToken,
            statuses: ["complete"],
            limit: sourceLimit,
            offset
          })
        : Promise.resolve([]),
      parallelDirectory.listPublicBrackets({ statuses: ["complete"], limit: sourceLimit, offset })
    ]);
    const items = [
      ...accessible.map((item) => ({ ...item, kind: "standard" })),
      ...publicItems.map((item) => ({ ...item, kind: "standard" })),
      ...accessibleParallel.map((item) => ({
        ...item,
        entryCount: item.candidateCount ?? 0,
        kind: "parallel_parent"
      })),
      ...publicParallel.map((item) => ({
        ...item,
        entryCount: item.candidateCount ?? 0,
        kind: "parallel_parent"
      }))
    ]
      .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
      .sort((a, b) => new Date(b.completedAt || b.updatedAt || 0) - new Date(a.completedAt || a.updatedAt || 0));

    return json({
      items: items.slice(0, limit),
      meta: {
        count: Math.min(items.length, limit),
        limit,
        offset,
        hasNextPage: [accessible, publicItems, accessibleParallel, publicParallel].some(
          (source) => source.length === sourceLimit
        )
      }
    });
  }

  const user = await getCurrentUser(request);
  const rateLimit = takeRequestRateLimit({
    key: `workspace-list:tournaments:${user.id}`
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
  const limit = Number.parseInt(searchParams.get("limit"), 10);
  const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
  const status = searchParams.get("status") || null;

  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0) {
    return json({ error: { code: "INVALID_PAGINATION", message: "limit (1-50) and offset (0+) are required." } }, { status: 400 });
  }
  if (status && !["draft", "active", "complete"].includes(status)) {
    return json({ error: { code: "INVALID_STATUS", message: "status must be draft, active, or complete." } }, { status: 400 });
  }

  const ownedBrackets = brackets({ creatorUserId: user.id });
  const [result, statusCounts] = await Promise.all([
    ownedBrackets.list({ status, limit, offset }),
    ownedBrackets.statusCounts()
  ]);
  return json({
    items: result.items,
    meta: { count: result.items.length, limit, offset, hasNextPage: result.hasNextPage, statusCounts }
  });
});

export const POST = withRouteErrorHandling(async function POST(request) {
  const user = await getCurrentUser(request);
  const payload = tournamentCreateSchema.parse(await readJson(request));
  const tournament = await brackets({ creatorUserId: user.id }).create(payload);

  return json(
    {
      item: tournament
    },
    { status: 201 }
  );
});


