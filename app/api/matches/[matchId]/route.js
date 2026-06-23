import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const { matchId } = await params;

  return NextResponse.json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message: `Match retrieval is not implemented yet for ${matchId}.`
      }
    },
    { status: 501 }
  );
}
