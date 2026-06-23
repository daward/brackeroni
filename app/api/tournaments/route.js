import { getCurrentUser } from "@/lib/auth/current-user";
import { createTournament, listTournaments } from "@/lib/data/tournaments";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { tournamentCreateSchema } from "@/lib/validation/tournament";

export const GET = withRouteErrorHandling(async function GET(request) {
  const user = await getCurrentUser(request);
  const items = await listTournaments({ creatorUserId: user.id });

  return json({
    items,
    meta: {
      count: items.length
    }
  });
});

export const POST = withRouteErrorHandling(async function POST(request) {
  const user = await getCurrentUser(request);
  const payload = tournamentCreateSchema.parse(await readJson(request));
  const tournament = await createTournament({
    creatorUserId: user.id,
    ...payload
  });

  return json(
    {
      item: tournament
    },
    { status: 201 }
  );
});
