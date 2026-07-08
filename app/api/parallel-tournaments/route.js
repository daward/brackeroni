import { getCurrentUser } from "@/lib/auth/current-user";
import {
  createParallelTournament,
  listParallelTournaments
} from "@/lib/data/parallel-tournaments";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { parallelTournamentCreateSchema } from "@/lib/validation/parallel-tournament";

export const GET = withRouteErrorHandling(async function GET(request) {
  const user = await getCurrentUser(request);
  const items = await listParallelTournaments({ creatorUserId: user.id });

  return json({
    items,
    meta: {
      count: items.length
    }
  });
});

export const POST = withRouteErrorHandling(async function POST(request) {
  const user = await getCurrentUser(request);
  const payload = parallelTournamentCreateSchema.parse(await readJson(request));
  const parallelTournament = await createParallelTournament({
    creatorUserId: user.id,
    ...payload
  });

  return json(
    {
      item: parallelTournament
    },
    { status: 201 }
  );
});
