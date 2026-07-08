import { NextResponse } from "next/server";

const IMPORT_PAYLOAD_STORAGE_KEY = "brackeroni-import-payload";

function buildBridgeHtml(payload) {
  const safePayloadLiteral = JSON.stringify(String(payload || ""))
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Importing…</title>
  </head>
  <body>
    <script>
      (function () {
        try {
          var payload = ${safePayloadLiteral};
          sessionStorage.setItem(${JSON.stringify(IMPORT_PAYLOAD_STORAGE_KEY)}, payload);
        } catch (error) {}
        window.location.replace("/import");
      })();
    </script>
  </body>
</html>`;
}

export async function GET(request) {
  return NextResponse.redirect(new URL("/import", request.url));
}

export async function POST(request) {
  const formData = await request.formData();
  const payload = String(formData.get("payload") || "").trim();

  return new NextResponse(buildBridgeHtml(payload), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
