import { getCurrentUser } from "@/lib/auth/current-user";
import { bracket } from "@/lib/brackets";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { bracketId } = await params;
  const tournament = await bracket({ bracketId, creatorUserId: user.id }).createRerun();

  return json(
    {
      item: tournament
    },
    { status: 201 }
  );
});
