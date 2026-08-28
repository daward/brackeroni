import { getCurrentUser, getOptionalCurrentUser } from "@/lib/auth/current-user";
import { getAnonymousVoterTokenFromRequest } from "@/lib/auth/viewer";
import { bracket, bracketDirectory } from "@/lib/brackets";
import { json, publicCacheControl, readJson, withCacheHeaders, withRouteErrorHandling } from "@/lib/api/http";
import { tournamentUpdateSchema } from "@/lib/validation/tournament";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const { tournamentId } = await params;
  const tournament = await bracketDirectory().getAccessibleTournamentById({
    tournamentId,
    userId: user?.id ?? null,
    anonymousVoterToken: getAnonymousVoterTokenFromRequest(request)
  });

  const response = json({ item: tournament });

  if (!user && (tournament.visibility === "public_listed" || tournament.visibility === "public_unlisted")) {
    return withCacheHeaders(response, {
      "cache-control": publicCacheControl({
        sMaxAge: tournament.status === "complete" ? 600 : 30,
        staleWhileRevalidate: tournament.status === "complete" ? 86400 : 300
      })
    });
  }

  return response;
});

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const patch = tournamentUpdateSchema.parse(await readJson(request));
  const hasLifecycleAction = patch.closeCurrentRound === true || patch.openNextRound === true;
  const currentBracket = bracket({ tournamentId, creatorUserId: user.id });
  const tournament = hasLifecycleAction
    ? await currentBracket.applyLifecyclePatch(patch).then(() => currentBracket.get())
    : await currentBracket.update(patch);

  return json({
    item: tournament,
    ...(patch.syncWithPool
      ? {
          meta: {
            addedEntryCount: tournament.syncAddedCount ?? 0
          }
        }
      : {})
  });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  await bracket({ tournamentId, creatorUserId: user.id }).archive();

  return json({
    ok: true
  });
});
