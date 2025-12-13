"use client";

import React, { useEffect, useState } from 'react';
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

  const [messages, setMessages] = useState<SysAdminLoginClientMessages>({
    page_title: '',
    page_description: '',
    no_permission_message: '',
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams({ lang: currentLocale });
        const res = await fetch(`/api/static-translations/sys-admin-login?${params.toString()}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          if (!cancelled) {
            setMessages({
              page_title: '',
              page_description: '',
              no_permission_message: '',
            });
          }
          return;
        }

        const data = (await res.json().catch(() => ({}))) as {
          messages?: Record<string, string>;
        };

        const dict = data?.messages ?? {};

        const next: SysAdminLoginClientMessages = {
          page_title: typeof dict.page_title === 'string' ? dict.page_title.trim() : '',
          page_description:
            typeof dict.page_description === 'string' ? dict.page_description.trim() : '',
          no_permission_message:
            typeof dict.no_permission_message === 'string' ? dict.no_permission_message.trim() : '',
        };

        if (!cancelled) {
          setMessages(next);
        }
      } catch {
        if (!cancelled) {
          setMessages({
            page_title: '',
            page_description: '',
            no_permission_message: '',
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [currentLocale]);

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
