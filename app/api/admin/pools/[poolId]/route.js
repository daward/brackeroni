import { requireAdminUser } from "@/lib/auth/admin";
import { deleteArchivedPool, updateAdminPoolVisibility } from "@/lib/data/admin";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { adminVisibilityUpdateSchema } from "@/lib/validation/admin";

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  await requireAdminUser(request);
  const { poolId } = await params;
  const payload = adminVisibilityUpdateSchema.parse(await readJson(request));
  await updateAdminPoolVisibility({
    poolId,
    visibility: payload.visibility
  });

  return json({ ok: true });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  await requireAdminUser(request);
  const { poolId } = await params;
  await deleteArchivedPool({ poolId });

  return json({ ok: true });
});
