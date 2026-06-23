import { getCurrentUser } from "@/lib/auth/current-user";
import { createCandidate, listCandidates } from "@/lib/data/candidates";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { candidateCreateSchema } from "@/lib/validation/candidate";

export const GET = withRouteErrorHandling(async function GET(request) {
  const user = await getCurrentUser(request);
  const search = request.nextUrl.searchParams.get("q")?.trim();
  const items = await listCandidates({ creatorUserId: user.id, search });

  return json({
    items,
    meta: {
      count: items.length
    }
  });
});

export const POST = withRouteErrorHandling(async function POST(request) {
  const user = await getCurrentUser(request);
  const payload = candidateCreateSchema.parse(await readJson(request));
  const candidate = await createCandidate({
    creatorUserId: user.id,
    ...payload
  });

  return json(
    {
      item: candidate
    },
    {
      status: 201
    }
  );
});
