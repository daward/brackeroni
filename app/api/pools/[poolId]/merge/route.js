import { getCurrentUser } from "@/lib/auth/current-user";
import { mergePoolIntoPool } from "@/lib/data/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { poolMergeSchema } from "@/lib/validation/pool";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  const payload = poolMergeSchema.parse(await readJson(request));
  const pool = await mergePoolIntoPool({
    poolId,
    sourcePoolId: payload.sourcePoolId,
    creatorUserId: user.id
  });

  return json({ item: pool });
});
