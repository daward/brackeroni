import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { bracket } from "@/lib/brackets";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";

const shareLinkRequestSchema = z
  .object({
    rotate: z.boolean().optional()
  })
  .optional();

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { bracketId } = await params;
  const items = await bracket({ bracketId, creatorUserId: user.id }).listShareLinks();

  return json({ items });
});

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { bracketId } = await params;
  const payload = shareLinkRequestSchema.parse(await readJson(request).catch(() => ({})));
  const currentBracket = bracket({ bracketId, creatorUserId: user.id });
  const item = payload?.rotate
    ? await currentBracket.rotateShareLink()
    : await currentBracket.ensureShareLink();

  return json({ item });
});
