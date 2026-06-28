import { requireAdminUser } from "@/lib/auth/admin";
import { deleteAllArchivedMaterial } from "@/lib/data/admin";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const DELETE = withRouteErrorHandling(async function DELETE(request) {
  await requireAdminUser(request);
  const result = await deleteAllArchivedMaterial();

  return json({
    ok: true,
    meta: result
  });
});
