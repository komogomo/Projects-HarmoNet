import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/src/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request,
    NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  );
}

export const config = {
  matcher: [
    '/t-admin/:path*',
    '/sys-admin/:path*',
  ],
};
