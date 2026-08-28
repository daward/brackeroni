import { getCurrentUser } from "@/lib/auth/current-user";
import { shareLinks } from "@/lib/brackets";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { token } = await params;
  const item = await shareLinks().getTarget({
    token,
    userId: user.id
  });

  return json({ item });
});
