import { getCurrentUser } from "@/lib/auth/current-user";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { updateBracketTemplate } from "@/lib/data/bracket-templates";
import { bracketTemplateUpdateSchema } from "@/lib/validation/bracket-template";

export const PATCH = withRouteErrorHandling(async function PATCH(request, context) {
  const user = await getCurrentUser(request);
  const { templateId } = context.params;
  const payload = bracketTemplateUpdateSchema.parse(await readJson(request));
  const item = await updateBracketTemplate({
    templateId,
    creatorUserId: user.id,
    name: payload.name,
    description: payload.description,
    subBrackets: payload.subBrackets,
    archive: payload.archive
  });

  return json({
    item
  });
});
