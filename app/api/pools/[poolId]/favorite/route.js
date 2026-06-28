import { getCurrentUser } from "@/lib/auth/current-user";
import { json, withRouteErrorHandling } from "@/lib/api/http";
import { favoritePool } from "@/lib/data/pools";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  const pool = await favoritePool({
    poolId,
    creatorUserId: user.id
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
