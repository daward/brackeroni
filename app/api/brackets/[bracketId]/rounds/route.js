import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { bracket } from "@/lib/brackets";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const { bracketId } = await params;
  const rounds = await bracket({
    bracketId,
    userId: user?.id ?? null
  }).listRounds();

  return json({ items: rounds });
});
