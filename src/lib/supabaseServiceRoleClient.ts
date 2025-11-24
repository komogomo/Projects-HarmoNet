import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let serviceRoleClient: SupabaseClient | null = null;

/**
 * Supabase クライアント（service_role 用、サーバーサイド専用）。
 *
 * - RLS をバイパスしてサーバー側でのみ内部テーブルを操作する用途に使用する。
 * - API ルートやサーバーコンポーネントなど、ブラウザから直接は呼ばれない場所でのみ利用すること。
 */
export function createSupabaseServiceRoleClient(): SupabaseClient {
  if (!serviceRoleClient) {
    serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
        },
      },
    );
  }

  return serviceRoleClient;
}
