import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const { tournamentId } = await params;

  return NextResponse.json({
    items: [],
    meta: {
      message: `Round listing is not implemented yet for ${tournamentId}.`
    }
  });
}
