import { getCurrentUser } from "@/lib/auth/current-user";
import { json, withRouteErrorHandling } from "@/lib/api/http";
import { pool } from "@/lib/pools";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  const poolDetail = await pool({ poolId, viewerUserId: user.id }).favorite();

  return json(
    {
      item: poolDetail
    },
    {
      status: 201
    }
  );
});
