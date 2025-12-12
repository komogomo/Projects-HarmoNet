"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';
import { LoginPageClient } from '@/src/components/auth/LoginPageClient/LoginPageClient';

type SysAdminLoginClientMessages = {
  page_title: string;
  page_description: string;
  no_permission_message: string;
};

export type SysAdminLoginClientProps = {
  hasSession: boolean;
  showNoPermissionMessage: boolean;
  redirectTo: string;
  signedInRedirectTo: string;
  testId?: string;
};

export const SysAdminLoginClient: React.FC<SysAdminLoginClientProps> = ({
  hasSession,
  showNoPermissionMessage,
  redirectTo,
  signedInRedirectTo,
  testId = 'sys-admin-login-page',
}) => {
  const { currentLocale } = useStaticI18n();

  const fallback = useMemo<SysAdminLoginClientMessages>(
    () => ({
      page_title: 'システム管理者ログイン',
      page_description: 'システム管理者専用のテナント管理コンソールへのログイン画面です。',
      no_permission_message: 'このアカウントにはシステム管理者権限がありません。',
    }),
    [],
  );

  const [messages, setMessages] = useState<SysAdminLoginClientMessages>(fallback);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams({ lang: currentLocale });
        const res = await fetch(`/api/static-translations/sys-admin-login?${params.toString()}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          if (!cancelled) setMessages(fallback);
          return;
        }

        const data = (await res.json().catch(() => ({}))) as {
          messages?: Record<string, string>;
        };

        const dict = data?.messages ?? {};

        const next: SysAdminLoginClientMessages = {
          page_title: (dict.page_title ?? fallback.page_title).trim() || fallback.page_title,
          page_description:
            (dict.page_description ?? fallback.page_description).trim() || fallback.page_description,
          no_permission_message:
            (dict.no_permission_message ?? fallback.no_permission_message).trim() ||
            fallback.no_permission_message,
        };

        if (!cancelled) {
          setMessages(next);
        }
      } catch {
        if (!cancelled) setMessages(fallback);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [currentLocale, fallback]);

  return (
    <LoginPageClient
      testId={testId}
      title={messages.page_title}
      subtitle={messages.page_description}
      showNoPermissionMessage={hasSession && showNoPermissionMessage}
      noPermissionMessage={messages.no_permission_message}
      redirectTo={redirectTo}
      signedInRedirectTo={signedInRedirectTo}
    />
  );
};

SysAdminLoginClient.displayName = 'SysAdminLoginClient';
