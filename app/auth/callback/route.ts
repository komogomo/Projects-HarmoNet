import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabaseServerClient";
import { logInfo, logError } from "@/src/lib/logging/log.util";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const tokenHash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type") ?? "email";
    const next = requestUrl.searchParams.get("next") ?? "/home";

    const supabase = await createSupabaseServerClient();

    // 0. 既に有効なセッションがある場合は、トークン検証をスキップしてそのまま next へ進む
    const {
        data: { user: existingUser },
        error: existingError,
    } = await supabase.auth.getUser();

    logInfo("auth.callback.route.start", {
        hasExistingUser: !!existingUser,
        hasTokenHash: !!tokenHash,
        hasCode: !!code,
        next,
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
            return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
        }

        if (authError) {
            logError("auth.callback.route.auth_error", {
                message: (authError as any)?.message ?? String(authError),
            });
            return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
        }
    }

    // 2. 最終的にユーザが存在するかだけ確認
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        logError("auth.callback.route.no_user_after_verify", {});
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`);
    }

    logInfo("auth.callback.route.success", {
        userId: user.id,
        next,
    });

    // 3. 認可チェックは /home 側に任せ、ここでは next にだけリダイレクトする
    return NextResponse.redirect(`${requestUrl.origin}${next}`);
}
