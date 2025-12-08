import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/src/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(
    request,
    NextResponse.next({
      request: {
        headers: request.headers,
      },
    }),
  );
}

export const config = {
  matcher: [
    // 静的アセット等を除き、ほぼ全てのパスでセッション更新を行う
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
