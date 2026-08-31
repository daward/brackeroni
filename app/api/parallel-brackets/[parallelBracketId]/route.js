import { getCurrentUser } from "@/lib/auth/current-user";
import {
  parallelBracketDirectory,
  parallelBracket
} from "@/lib/brackets";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { parallelTournamentUpdateSchema } from "@/lib/validation/parallel-tournament";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { parallelBracketId } = await params;
  const item = await parallelBracketDirectory().getAccessibleBracketById({
    parallelBracketId,
    userId: user.id
  });

  return json({ item });
});

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { parallelBracketId } = await params;
  const patch = parallelTournamentUpdateSchema.parse(await readJson(request));
  const item = await parallelBracket({ parallelBracketId, creatorUserId: user.id }).update(patch);

  return json({ item });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  const user = await getCurrentUser(request);
  const { parallelBracketId } = await params;
  await parallelBracket({ parallelBracketId, creatorUserId: user.id }).archive();

  return json({ ok: true });
});
