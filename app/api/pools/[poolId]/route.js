import { getCurrentUser, getOptionalCurrentUser } from "@/lib/auth/current-user";
import { archivePool, getPoolById, updatePool } from "@/lib/data/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { poolUpdateSchema } from "@/lib/validation/pool";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const { poolId } = await params;
  const pool = await getPoolById({
    poolId,
    userId: user?.id ?? null
  });

  return json({ item: pool });
});

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  const patch = poolUpdateSchema.parse(await readJson(request));
  const pool = await updatePool({
    poolId,
    creatorUserId: user.id,
    patch
  });

  return json({ item: pool });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  await archivePool({
    poolId,
    userId: user.id
  });

  return json({
    ok: true
  });
});
