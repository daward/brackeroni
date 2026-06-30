import { requireAdminUser } from "@/lib/auth/admin";
import { deleteArchivedPool, updateAdminPool } from "@/lib/data/admin";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { adminPoolUpdateSchema } from "@/lib/validation/admin";

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  await requireAdminUser(request);
  const { poolId } = await params;
  const payload = adminPoolUpdateSchema.parse(await readJson(request));
  await updateAdminPool({
    poolId,
    visibility: payload.visibility,
    featuredOnHome: payload.featuredOnHome
  });

  return json({ ok: true });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  await requireAdminUser(request);
  const { poolId } = await params;
  await deleteArchivedPool({ poolId });

  return json({ ok: true });
});
