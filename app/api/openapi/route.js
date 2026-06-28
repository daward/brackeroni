import { NextResponse } from "next/server";
import { openApiDocument } from "@/openapi/document";

export function GET(request) {
  return NextResponse.json({
    ...openApiDocument,
    servers: [
      {
        url: request.nextUrl.origin,
        description: "Current environment"
      }
    ]
  });
}
