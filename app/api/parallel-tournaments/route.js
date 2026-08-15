import { getCurrentUser } from "@/lib/auth/current-user";
import {
  createParallelTournament,
  getParallelTournamentStatusCounts,
  listParallelTournaments
} from "@/lib/data/parallel-tournaments";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { takeRequestRateLimit } from "@/lib/api/request-rate-limit";
import { parallelTournamentCreateSchema } from "@/lib/validation/parallel-tournament";

export const GET = withRouteErrorHandling(async function GET(request) {
  const user = await getCurrentUser(request);
  const rateLimit = takeRequestRateLimit({
    key: `workspace-list:parallel-tournaments:${user.id}`
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
  const { searchParams } = request.nextUrl;
  const limit = Number.parseInt(searchParams.get("limit"), 10);
  const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
  const status = searchParams.get("status") || null;

  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0) {
    return json({ error: { code: "INVALID_PAGINATION", message: "limit (1-50) and offset (0+) are required." } }, { status: 400 });
  }
  if (status && !["draft", "active", "complete"].includes(status)) {
    return json({ error: { code: "INVALID_STATUS", message: "status must be draft, active, or complete." } }, { status: 400 });
  }

  const [result, statusCounts] = await Promise.all([
    listParallelTournaments({ creatorUserId: user.id, status, limit, offset }),
    getParallelTournamentStatusCounts({ creatorUserId: user.id })
  ]);
  return json({
    items: result.items,
    meta: { count: result.items.length, limit, offset, hasNextPage: result.hasNextPage, statusCounts }
  });
});

export const POST = withRouteErrorHandling(async function POST(request) {
  const user = await getCurrentUser(request);
  const payload = parallelTournamentCreateSchema.parse(await readJson(request));
  const parallelTournament = await createParallelTournament({
    creatorUserId: user.id,
    ...payload
  });

  return json(
    {
      item: parallelTournament
    },
    { status: 201 }
  );
});


