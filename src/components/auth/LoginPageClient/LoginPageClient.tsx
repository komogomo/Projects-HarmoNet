"use client";

import React from 'react';
import { useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';
import { MagicLinkForm } from '@/src/components/auth/MagicLinkForm/MagicLinkForm';

export type LoginPageClientProps = {
  testId?: string;
  title?: string;
  subtitle?: string;
  showNoPermissionMessage?: boolean;
  noPermissionMessage?: string;
  redirectTo?: string;
  signedInRedirectTo?: string;
};

export const LoginPageClient: React.FC<LoginPageClientProps> = ({
  testId = 'login-page',
  title,
  subtitle,
  showNoPermissionMessage,
  noPermissionMessage,
  redirectTo,
  signedInRedirectTo,
}) => {
  const { t } = useStaticI18n();

  const pageTitle = title ?? t('app_title');
  const pageSubtitle = subtitle ?? t('app_subtitle');

  return (
    <main className="min-h-screen flex flex-col bg-white" data-testid={testId}>
      <div className="flex-1 flex flex-col items-center px-4 pt-28 pb-28">
        <section className="w-full max-w-md text-center mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">{pageTitle}</h1>
          <p className="text-sm text-gray-500">{pageSubtitle}</p>
        </section>

        <section className="w-full max-w-md">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              {showNoPermissionMessage && !!noPermissionMessage && (
                <div className="mb-4 rounded-2xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
                  {noPermissionMessage}
                </div>
              )}
              <MagicLinkForm
                className="h-full"
                redirectTo={redirectTo}
                signedInRedirectTo={signedInRedirectTo}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

LoginPageClient.displayName = 'LoginPageClient';
