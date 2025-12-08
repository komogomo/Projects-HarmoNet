import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ errorCode: "not_implemented" }, { status: 501 });
}

