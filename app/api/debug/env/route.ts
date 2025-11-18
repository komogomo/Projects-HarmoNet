import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasCorbadoSecret: !!process.env.CORBADO_API_SECRET,
    supabasePublic: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    corbadoProjectId: !!process.env.NEXT_PUBLIC_CORBADO_PROJECT_ID
  })
}
