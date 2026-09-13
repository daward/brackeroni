import { getCurrentUser } from "@/lib/auth/current-user";
import { json, withRouteErrorHandling } from "@/lib/api/http";
import { searchImageSuggestions } from "@/lib/images/suggestions";

export const GET = withRouteErrorHandling(async function GET(request) {
  await getCurrentUser(request);

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  return json({
    items: await searchImageSuggestions(query)
  });
});
