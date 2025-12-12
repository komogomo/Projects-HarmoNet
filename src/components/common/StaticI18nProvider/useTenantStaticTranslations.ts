"use client";

import { useEffect } from 'react';
import { useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';

export type TenantStaticTranslationsParams = {
  tenantId?: string;
  apiPath: string;
};

export function useTenantStaticTranslations({ tenantId, apiPath }: TenantStaticTranslationsParams): void {
  const { currentLocale, mergeTranslations } = useStaticI18n();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!tenantId) return;
        if (!apiPath) return;

        const params = new URLSearchParams({ tenantId, lang: currentLocale });
        const res = await fetch(`/api/tenant-static-translations/${apiPath}?${params.toString()}`);
        if (!res.ok) return;

        const data = (await res.json().catch(() => ({}))) as { messages?: Record<string, string> };
        const messages = data?.messages;
        if (cancelled) return;
        if (!messages || typeof messages !== 'object') return;

        mergeTranslations(messages);
      } catch {
        // ignore (no fallback)
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [tenantId, apiPath, currentLocale, mergeTranslations]);
}
