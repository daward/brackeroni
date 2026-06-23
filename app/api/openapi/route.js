import { NextResponse } from "next/server";
import { openApiDocument } from "@/openapi/document";

export function GET() {
  return NextResponse.json(openApiDocument);
}
