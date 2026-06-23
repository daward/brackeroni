import { NextResponse } from "next/server";

export async function POST(_, { params }) {
  const routeParams = await params;

  return NextResponse.json(
    {
      error: {
        code: "DEPRECATED_ROUTE",
        message: `Use PATCH /api/tournaments/${routeParams.tournamentId} instead. Verb-based routes are deprecated.`
      }
    },
    { status: 410 }
  );
}
