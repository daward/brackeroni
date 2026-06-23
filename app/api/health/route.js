import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "brackeroni",
    timestamp: new Date().toISOString()
  });
}
