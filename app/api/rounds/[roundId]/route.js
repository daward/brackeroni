import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { round } from "@/lib/brackets";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";

const roundUpdateSchema = z.object({
  revealed: z.literal(true)
});

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { roundId } = await params;
  roundUpdateSchema.parse(await readJson(request));

  const item = await round({
    roundId,
    creatorUserId: user.id
  }).reveal();

  return json({ item });
});
