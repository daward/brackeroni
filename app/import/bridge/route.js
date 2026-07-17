import { NextResponse } from "next/server";

const IMPORT_PAYLOAD_STORAGE_KEY = "brackeroni-import-payload";
const IMPORT_PAYLOAD_MESSAGE_TYPE = "BRACKERONI_IMPORT_PAYLOAD";
const IMPORT_READY_MESSAGE_TYPE = "BRACKERONI_IMPORT_READY";

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
    <title>Importing...</title>
  </head>
  <body>
    <script>
      (function () {
        try {
          var payload = ${safePayloadLiteral};
          if (payload) {
            sessionStorage.setItem(${JSON.stringify(IMPORT_PAYLOAD_STORAGE_KEY)}, payload);
            window.location.replace("/import");
            return;
          }
        } catch (error) {}

        function handleMessage(event) {
          if (!event.data || event.data.type !== ${JSON.stringify(IMPORT_PAYLOAD_MESSAGE_TYPE)}) {
            return;
          }

          try {
            sessionStorage.setItem(
              ${JSON.stringify(IMPORT_PAYLOAD_STORAGE_KEY)},
              JSON.stringify(event.data.payload || {})
            );
          } catch (error) {}

          window.location.replace("/import");
        }

        window.addEventListener("message", handleMessage);

        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(
              { type: ${JSON.stringify(IMPORT_READY_MESSAGE_TYPE)} },
              "*"
            );
          }
        } catch (error) {}
      })();
    </script>
  </body>
</html>`;
}

export async function GET() {
  return new NextResponse(buildBridgeHtml(""), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
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
