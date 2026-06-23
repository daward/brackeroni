import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  ensureTournamentShareLink,
  listTournamentShareLinks,
  rotateTournamentShareLink
} from "@/lib/data/tournaments";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";

const shareLinkRequestSchema = z
  .object({
    rotate: z.boolean().optional()
  })
  .optional();

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const items = await listTournamentShareLinks({
    tournamentId,
    creatorUserId: user.id
  });

  return json({ items });
});

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const payload = shareLinkRequestSchema.parse(await readJson(request).catch(() => ({})));
  const item = payload?.rotate
    ? await rotateTournamentShareLink({
        tournamentId,
        creatorUserId: user.id
      })
    : await ensureTournamentShareLink({
        tournamentId,
        creatorUserId: user.id
      });

  return json({ item });
});
