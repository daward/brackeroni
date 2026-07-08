import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  ensureParallelTournamentShareLink,
  listParallelTournamentShareLinks,
  rotateParallelTournamentShareLink
} from "@/lib/data/parallel-tournaments";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";

const shareLinkRequestSchema = z
  .object({
    rotate: z.boolean().optional()
  })
  .optional();

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { parallelTournamentId } = await params;
  const items = await listParallelTournamentShareLinks({
    parallelTournamentId,
    creatorUserId: user.id
  });

  return json({ items });
});

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { parallelTournamentId } = await params;
  const payload = shareLinkRequestSchema.parse(await readJson(request).catch(() => ({})));
  const item = payload?.rotate
    ? await rotateParallelTournamentShareLink({
        parallelTournamentId,
        creatorUserId: user.id
      })
    : await ensureParallelTournamentShareLink({
        parallelTournamentId,
        creatorUserId: user.id
      });

  return json({ item });
});
