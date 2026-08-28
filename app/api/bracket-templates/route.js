import { getCurrentUser } from "@/lib/auth/current-user";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { bracketTemplates } from "@/lib/brackets";
import { bracketTemplateCreateSchema } from "@/lib/validation/bracket-template";

export const GET = withRouteErrorHandling(async function GET(request) {
  const user = await getCurrentUser(request);
  const templates = bracketTemplates({ userId: user.id });
  const items = await templates.list();

  return json({
    items
  });
});

export const POST = withRouteErrorHandling(async function POST(request) {
  const user = await getCurrentUser(request);
  const payload = bracketTemplateCreateSchema.parse(await readJson(request));
  const templates = bracketTemplates({ userId: user.id });
  const item = await templates.create({
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
