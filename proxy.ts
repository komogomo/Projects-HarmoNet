import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/src/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';

  // Vercel の preview ドメインなど、*.vercel.app でアクセスされた場合は
  // すべて canonical ドメイン www.harmonet-stg.com に統一する。
  if (host.endsWith('.vercel.app')) {
    const url = new URL(request.url);
    url.host = 'www.harmonet-stg.com';
    return NextResponse.redirect(url, 308);
  }

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
