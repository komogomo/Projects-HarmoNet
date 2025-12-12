import React from 'react';
import { SysAdminFooterLogout } from '@/src/components/sys-admin/SysAdminFooterLogout/SysAdminFooterLogout';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';

export default async function SysAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-24">
      <div className="mx-auto w-full max-w-5xl px-4">
        {children}
      </div>
      {user ? <SysAdminFooterLogout /> : null}
    </div>
  );
}
