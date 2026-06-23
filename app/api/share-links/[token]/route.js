import { getCurrentUser } from "@/lib/auth/current-user";
import { getTournamentByShareToken } from "@/lib/data/tournaments";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { token } = await params;
  const item = await getTournamentByShareToken({
    token,
    userId: user.id
  });

  return json({ item });
});
