"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';
import { SysAdminTenantsConsole } from '@/src/components/sys-admin/SysAdminTenantsConsole/SysAdminTenantsConsole';

type SysAdminTenantsPageClientMessages = {
  page_title: string;
  tenants_load_error_title: string;
  tenants_load_error_description: string;
};

type TenantStatus = 'active' | 'inactive';

type TenantListItem = {
  id: string;
  tenant_code: string;
  tenant_name: string;
  timezone: string;
  status: TenantStatus;
  created_at: string | null;
};

export type SysAdminTenantsPageClientProps = {
  initialTenants: TenantListItem[];
  hasLoadError: boolean;
  testId?: string;
};

export const SysAdminTenantsPageClient: React.FC<SysAdminTenantsPageClientProps> = ({
  initialTenants,
  hasLoadError,
  testId = 'sys-admin-tenants-page',
}) => {
  const { currentLocale } = useStaticI18n();

  const fallback = useMemo<SysAdminTenantsPageClientMessages>(
    () => ({
      page_title: 'テナント管理コンソール',
      tenants_load_error_title: 'テナント一覧の取得に失敗しました。',
      tenants_load_error_description: '時間をおいて再度お試しください。',
    }),
    [],
  );

  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams({ lang: currentLocale });
        const res = await fetch(`/api/sys-admin/tenants/translations?${params.toString()}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          if (!cancelled) setMessages({});
          return;
        }

        const data = (await res.json().catch(() => ({}))) as {
          messages?: Record<string, string>;
        };

        if (!cancelled) {
          setMessages((data?.messages ?? {}) as Record<string, string>);
        }
      } catch {
        if (!cancelled) setMessages({});
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [currentLocale]);

  const resolveMessage = (key: keyof SysAdminTenantsPageClientMessages): string => {
    const fromDb = messages[key];
    if (typeof fromDb === 'string' && fromDb.trim().length > 0) {
      return fromDb;
    }
    return fallback[key];
  };

  if (hasLoadError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white" data-testid={testId}>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold text-gray-900">
            {resolveMessage('tenants_load_error_title')}
          </h1>
          <p className="text-sm text-gray-600">
            {resolveMessage('tenants_load_error_description')}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full" data-testid={testId}>
      <div className="pt-4 pb-8 space-y-4">
        <header className="mb-2 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">
            {resolveMessage('page_title')}
          </h1>
        </header>

        <SysAdminTenantsConsole initialTenants={initialTenants} />
      </div>
    </main>
  );
};

SysAdminTenantsPageClient.displayName = 'SysAdminTenantsPageClient';
