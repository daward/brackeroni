"use client";

const swaggerSrcDoc = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Brackeroni API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }

      #swagger-ui {
        min-height: 100vh;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = function () {
        window.SwaggerUIBundle({
          url: "/api/openapi",
          dom_id: "#swagger-ui",
          deepLinking: true,
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: "list",
          requestInterceptor: function (request) {
            request.credentials = "include";
            return request;
          }
        });
      };
    </script>
  </body>
</html>`;

export function SwaggerUiShell() {
  return (
    <iframe
      title="Swagger UI"
      srcDoc={swaggerSrcDoc}
      sandbox="allow-scripts allow-same-origin allow-forms"
      className="block h-[85vh] w-full border-0 bg-white"
    />
  );
}
