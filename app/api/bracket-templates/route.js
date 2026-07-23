import { getCurrentUser } from "@/lib/auth/current-user";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { createBracketTemplate, listBracketTemplates } from "@/lib/data/bracket-templates";
import { bracketTemplateCreateSchema } from "@/lib/validation/bracket-template";

export const GET = withRouteErrorHandling(async function GET(request) {
  const user = await getCurrentUser(request);
  const items = await listBracketTemplates({ userId: user.id });

  return json({
    items
  });
});

export const POST = withRouteErrorHandling(async function POST(request) {
  const user = await getCurrentUser(request);
  const payload = bracketTemplateCreateSchema.parse(await readJson(request));
  const item = await createBracketTemplate({
    creatorUserId: user.id,
    name: payload.name,
    description: payload.description,
    subBrackets: payload.subBrackets
  });

  return json(
    {
      item
    },
    { status: 201 }
  );
});

