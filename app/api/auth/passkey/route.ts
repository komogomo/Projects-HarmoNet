import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CORBADO_ISSUER = process.env.CORBADO_ISSUER; // 例: https://api.corbado.io/<tenant>
const CORBADO_AUD = process.env.CORBADO_AUD; // Corbado の audience (project id)

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function verifyIdTokenJWKS(idToken: string) {
  if (!CORBADO_ISSUER || !CORBADO_AUD) {
    throw new Error("CORBADO_ISSUER or CORBADO_AUD is not set");
  }
  const jwks = createRemoteJWKSet(new URL(`${CORBADO_ISSUER}/.well-known/jwks.json`));
  return await jwtVerify(idToken, jwks, { issuer: CORBADO_ISSUER, audience: CORBADO_AUD });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("[passkey-debug] req.keys:", Object.keys(body));
    const idToken = (body as any)?.idToken as string | undefined;
    console.log("[passkey-debug] idToken present:", !!idToken, "len:", idToken ? idToken.length : 0);
    console.log(
      "[passkey-debug] env CORBADO_ISSUER:",
      !!process.env.CORBADO_ISSUER,
      "CORBADO_AUD:",
      !!process.env.CORBADO_AUD,
    );
    console.log("[passkey-debug] env SUPABASE_SERVICE_ROLE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!idToken) {
      return NextResponse.json({ status: "error", code: "NO_IDTOKEN" }, { status: 400 });
    }

    // 1) verify via JWKS (Corbado)
    let payload: any;
    try {
      const res = await verifyIdTokenJWKS(idToken);
      payload = res.payload;
      console.log("[passkey-debug] verify ok claims:", Object.keys(payload || {}));
    } catch (e) {
      console.error("[passkey-debug] verify failed:", String(e));
      return NextResponse.json(
        { status: "error", code: "INVALID_IDTOKEN", message: String(e) },
        { status: 401 },
      );
    }

    // 2) If supabase client configured, attempt sign in
    if (!supabase) {
      console.warn("[passkey-debug] supabase client not configured (service role missing)");
      return NextResponse.json({ status: "ok", note: "verified_but_no_supabase" });
    }

    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "corbado",
        token: idToken,
      });
      console.log("[passkey-debug] supabase signIn result:", {
        dataExists: !!data,
        error: (error as any)?.message,
      });
      if (error) throw error;
      return NextResponse.json({ status: "ok", data: !!data });
    } catch (e) {
      console.error("[passkey-debug] supabase failure:", String(e));
      return NextResponse.json(
        { status: "error", code: "SUPABASE_FAILED", message: String(e) },
        { status: 500 },
      );
    }
  } catch (e) {
    console.error("[passkey-debug] unexpected:", e);
    return NextResponse.json(
      { status: "error", code: "UNEXPECTED", message: String(e) },
      { status: 500 },
    );
  }
}
