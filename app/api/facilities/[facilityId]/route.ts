import { NextRequest, NextResponse } from "next/server";

interface FacilityRouteContext {
  params: Promise<{
    facilityId: string;
  }>;
}

export async function GET(req: NextRequest, context: FacilityRouteContext) {
  const params = await context.params;
  const facilityId: string | undefined = params.facilityId;

  if (!facilityId) {
    return NextResponse.json({ errorCode: "validation_error" }, { status: 400 });
  }

  return NextResponse.json({ errorCode: "not_implemented" }, { status: 501 });
}

