"use client";

import React from 'react';
import { useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';
import { MagicLinkForm } from '@/src/components/auth/MagicLinkForm/MagicLinkForm';

export type LoginPageClientProps = {
  testId?: string;
};

export const LoginPageClient: React.FC<LoginPageClientProps> = ({ testId = 'login-page' }) => {
  const { t } = useStaticI18n();

  return (
    <main className="min-h-screen flex flex-col bg-white" data-testid={testId}>
      <div className="flex-1 flex flex-col items-center px-4 pt-28 pb-28">
        <section className="w-full max-w-md text-center mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">{t('app_title')}</h1>
          <p className="text-sm text-gray-500">{t('app_subtitle')}</p>
        </section>

        <section className="w-full max-w-md">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <MagicLinkForm className="h-full" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

LoginPageClient.displayName = 'LoginPageClient';
