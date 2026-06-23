import { getCurrentUser } from "@/lib/auth/current-user";
import { createPool, listPools } from "@/lib/data/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { poolCreateSchema } from "@/lib/validation/pool";

export const GET = withRouteErrorHandling(async function GET(request) {
  const user = await getCurrentUser(request);
  const items = await listPools({ creatorUserId: user.id });

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
  const pool = await createPool({
    creatorUserId: user.id,
    ...payload
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
