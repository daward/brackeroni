import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import {
  createAnonymousVoterToken,
  getAnonymousVoterTokenFromRequest,
  ANONYMOUS_VOTER_COOKIE
} from "@/lib/auth/viewer";
import { openParallelTournamentParticipantBracket } from "@/lib/data/parallel-tournaments";
import { json, withRouteErrorHandling } from "@/lib/api/http";
import { NextResponse } from "next/server";

async function openParticipantBracket(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const { parallelTournamentId } = await params;
  const existingAnonymousVoterToken = getAnonymousVoterTokenFromRequest(request);
  const anonymousVoterToken = user ? null : existingAnonymousVoterToken || createAnonymousVoterToken();

  const item = await openParallelTournamentParticipantBracket({
    parallelTournamentId,
    userId: user?.id ?? null,
    anonymousVoterToken
  });

  return {
    user,
    item,
    existingAnonymousVoterToken,
    anonymousVoterToken
  };
}

function applyAnonymousCookie(response, { user, anonymousVoterToken, existingAnonymousVoterToken }) {
  if (!user && anonymousVoterToken && anonymousVoterToken !== existingAnonymousVoterToken) {
    response.headers.set(
      "set-cookie",
      `${ANONYMOUS_VOTER_COOKIE}=${anonymousVoterToken}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`
    );
  }

  return response;
}

export const POST = withRouteErrorHandling(async function POST(request, context) {
  const result = await openParticipantBracket(request, context);

  const response = json({
    item: result.item
  });

  return applyAnonymousCookie(response, result);
});

export const GET = withRouteErrorHandling(async function GET(request, context) {
  const result = await openParticipantBracket(request, context);
  const destination = new URL(
    `/vote?tournament=${result.item.tournamentId}`,
    request.url
  );
  const returnTo = request.nextUrl.searchParams.get("returnTo");

  if (returnTo) {
    destination.searchParams.set("returnTo", returnTo);
  }

  const response = NextResponse.redirect(destination);
  return applyAnonymousCookie(response, result);
});
