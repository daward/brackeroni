import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const { roundId } = await params;

  return NextResponse.json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message: `Round retrieval is not implemented yet for ${roundId}.`
      }
    },
    { status: 501 }
  );
}

export async function PATCH(_, { params }) {
  const { roundId } = await params;

  return NextResponse.json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message: `Round update is not implemented yet for ${roundId}.`
      }
    },
    { status: 501 }
  );
}
