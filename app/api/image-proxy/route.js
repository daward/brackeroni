import { json, withRouteErrorHandling } from "@/lib/api/http";

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const GET = withRouteErrorHandling(async function GET(request) {
  const targetUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";

  if (!isHttpUrl(targetUrl)) {
    throw new Error("INVALID_IMAGE_PROXY_URL");
  }

  const upstream = await fetch(targetUrl, {
    headers: {
      accept: "image/*"
    },
    next: {
      revalidate: 3600
    }
  });

  if (!upstream.ok) {
    throw new Error("IMAGE_PROXY_UNAVAILABLE");
  }

  const contentType = upstream.headers.get("content-type") ?? "";

  if (!contentType.startsWith("image/")) {
    throw new Error("IMAGE_PROXY_INVALID_TYPE");
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=3600"
    }
  });
});
