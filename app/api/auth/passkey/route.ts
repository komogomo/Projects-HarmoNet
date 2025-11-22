import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      status: "error",
      code: "PASSKEY_DISABLED",
      message: "Passkey authentication has been disabled.",
    },
    { status: 410 },
  );
}
