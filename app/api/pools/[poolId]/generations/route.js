import { getCurrentUser } from "@/lib/auth/current-user";
import { pool } from "@/lib/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { generateCandidatesWithGemini } from "@/lib/gemini/generate-candidates";
import { poolCandidateGenerationSchema } from "@/lib/validation/pool";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  const payload = poolCandidateGenerationSchema.parse(await readJson(request));
  const generated = await generateCandidatesWithGemini(payload);
  const result = await pool({ poolId, viewerUserId: user.id }).importCandidates({
    candidates: generated.candidates
  });
  const importedNameSet = new Set(result.importedNames.map((name) => name.trim().toLowerCase()).filter(Boolean));
  const imageCount = result.pool.candidates.filter(
    (candidate) => candidate.imageUrl && importedNameSet.has(candidate.name.trim().toLowerCase())
  ).length;

  return json({
    item: result.pool,
    meta: {
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      importedNames: result.importedNames,
      skippedNames: result.skippedNames,
      requestedCount: payload.count,
      generatedCount: generated.candidates.length,
      generatedImageCount: generated.generatedImageCount,
      imageCount,
      model: generated.model
    }
  });
});
