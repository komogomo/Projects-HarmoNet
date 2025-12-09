import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { logInfo, logError } from "@/src/lib/logging/log.util";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const tokenHash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type") ?? "email";
    const nextPath = requestUrl.searchParams.get("next") ?? "/home";

    // 成功時のリダイレクト先をあらかじめ設定したレスポンスを作成しておき、
    // Supabase の cookie 書き込みはこのレスポンスに対して行う。
    const nextUrl = new URL(nextPath, requestUrl.origin);
    const response = NextResponse.redirect(nextUrl);

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        },
    );

    // 0. 既に有効なセッションがある場合は、トークン検証をスキップしてそのまま next へ進む
    const {
        data: { user: existingUser },
        error: existingError,
    } = await supabase.auth.getUser();

    logInfo("auth.callback.route.start", {
        hasExistingUser: !!existingUser,
        hasTokenHash: !!tokenHash,
        hasCode: !!code,
        next: nextPath,
    });

    let authError: unknown = null;

    if (!existingUser || existingError) {
        // 1. セッションが無い場合のみ、PKCE / token_hash フローを実行
        if (tokenHash) {
            const { error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: type as any,
            });
            authError = error;
        } else if (code) {
            // 2. 既存の code ベースフローも後方互換として残す
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            authError = error;
        } else {
            // code も token_hash も無い場合は即座にログイン画面へ
            logError("auth.callback.route.missing_token", {});
            response.headers.set("Location", `${requestUrl.origin}/login?error=auth_failed`);
            return response;
        }

        if (authError) {
            logError("auth.callback.route.auth_error", {
                message: (authError as any)?.message ?? String(authError),
            });
            response.headers.set("Location", `${requestUrl.origin}/login?error=auth_failed`);
            return response;
        }
    }

    // 2. 最終的にユーザが存在するかだけ確認
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        logError("auth.callback.route.no_user_after_verify", {});
        response.headers.set("Location", `${requestUrl.origin}/login?error=auth_failed`);
        return response;
    }

    logInfo("auth.callback.route.success", {
        userId: user.id,
        next: nextPath,
    });

    // 3. 認可チェックは /home 側に任せ、ここでは next にだけリダイレクトする
    return response;
}
