import { getCurrentUser } from "@/lib/auth/current-user";
import { getCandidateById, updateCandidate } from "@/lib/data/candidates";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { candidateUpdateSchema } from "@/lib/validation/candidate";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { candidateId } = await params;
  const candidate = await getCandidateById({
    candidateId,
    creatorUserId: user.id
  });

  return json({ item: candidate });
});

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { candidateId } = await params;
  const patch = candidateUpdateSchema.parse(await readJson(request));
  const candidate = await updateCandidate({
    candidateId,
    creatorUserId: user.id,
    patch
  });

  return json({ item: candidate });
});
