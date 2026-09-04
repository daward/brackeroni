import { getCurrentUser } from "@/lib/auth/current-user";
import { createBracketFromPrompt, previewBracketIntent } from "@/lib/brackets";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { bracketIntentRequestSchema } from "@/lib/validation/bracket-intent";

export const POST = withRouteErrorHandling(async function POST(request) {
  const user = await getCurrentUser(request);
  const payload = bracketIntentRequestSchema.parse(await readJson(request));

  if (payload.action === "create") {
    const result = await createBracketFromPrompt({
      creatorUserId: user.id,
      prompt: payload.prompt
    });

    return json(
      {
        item: result.item,
        plan: result.plan,
        meta: {
          sourceSummary: result.sourceSummary,
          startedAutomatically: false,
          publishedAutomatically: false
        }
      },
      { status: 201 }
    );
  }

  const preview = await previewBracketIntent({
    creatorUserId: user.id,
    prompt: payload.prompt
  });

  return json({
    item: preview.plan,
    meta: {
      sourceSummary: preview.sourceSummary,
      safety: preview.safety,
      matchedPools: preview.matchedPools
    }
  });
});
