import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { revealTournamentRound } from "@/lib/data/rounds";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";

const roundUpdateSchema = z.object({
  revealed: z.literal(true)
});

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { roundId } = await params;
  roundUpdateSchema.parse(await readJson(request));

  const round = await revealTournamentRound({
    roundId,
    creatorUserId: user.id
  });

  return json({ item: round });
});
