"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { Mail as MailIcon, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';
import { logInfo, logError } from '@/src/lib/logging/log.util';
import type { MagicLinkError, MagicLinkFormProps, MagicLinkFormState } from './MagicLinkForm.types';

type BannerState = {
  kind: 'info' | 'error';
  messageKey: string;
} | null;

const cardBaseClassName =
  'rounded-lg border-2 border-gray-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

const emailInputClassName =
  'mt-1 block w-full max-w-xs h-11 px-3 mx-auto rounded-md border-2 border-gray-300 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500';

const loginButtonClassName =
  'mt-3 w-full max-w-xs h-11 mx-auto rounded-md bg-[#6495ed] text-white text-sm font-semibold flex items-center justify-center disabled:opacity-60 hover:bg-[#5386d9] transition-colors';

type AuthErrorBannerProps = {
  kind: 'info' | 'error';
  message: string;
};

const AuthErrorBanner: React.FC<AuthErrorBannerProps> = ({ kind, message }) => {
  if (!message) return null;
  const base = 'w-full max-w-xs rounded-md px-3 py-2 text-sm flex items-start gap-2 mx-auto';
  const palette = kind === 'info' ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-700';
  return (
    <div className={`${base} ${palette}`} role={kind === 'error' ? 'alert' : 'status'} aria-live="polite">
      {kind === 'info' && (
        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
      )}
      <span className="flex-1">{message}</span>
    </div>
  );
};

export const MagicLinkForm: React.FC<MagicLinkFormProps> = ({
  className,
  onSent,
  onError,
  redirectTo,
  signedInRedirectTo,
}) => {
  const { t } = useStaticI18n();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<MagicLinkFormState>('idle');
  const [banner, setBanner] = useState<BannerState>(null);

  const postSignInRedirectTo = signedInRedirectTo ?? '/home';

  const handleLogin = useCallback(async () => {
    if (!validateEmail(email)) {
      const error: MagicLinkError = {
        code: 'INVALID_EMAIL',
        message: t('auth.login.error.email_invalid'),
        type: 'error_input',
      };

      setState('error_input');
      setBanner({ kind: 'error', messageKey: 'auth.login.error.email_invalid' });

      logError('auth.login.fail.input', {
        screen: 'LoginPage',
        method: 'magiclink',
      });

      onError?.(error);
      return;
    }

    try {
      setState('sending');
      setBanner(null);

      logInfo('auth.login.start', {
        screen: 'LoginPage',
        method: 'magiclink',
      });

      const targetRedirectTo = redirectTo ?? '/auth/callback';

      const redirectUrl = (() => {
        try {
          return new URL(targetRedirectTo, 'http://local');
        } catch {
          return null;
        }
      })();

      // Supabase が code/token_hash 等を付与するため、emailRedirectTo にクエリは含めない。
      // （クエリ付きだとクラウド環境で付与に失敗し、/auth/callback 側で session が確立しないことがある）
      const callbackPath = redirectUrl?.pathname ?? '/auth/callback';

      // ログイン完了後に遷移したいパスは cookie に退避して /auth/callback で回収する。
      const nextFromQuery = redirectUrl?.searchParams.get('next');
      if (nextFromQuery && nextFromQuery.startsWith('/') && !nextFromQuery.startsWith('//')) {
        const maxAgeSeconds = 10 * 60;
        const isHttps = window.location.protocol === 'https:';
        document.cookie = [
          `hn_post_auth_next=${encodeURIComponent(nextFromQuery)}`,
          'Path=/',
          `Max-Age=${maxAgeSeconds}`,
          'SameSite=Lax',
          isHttps ? 'Secure' : '',
        ]
          .filter(Boolean)
          .join('; ');
      }

      const currentOrigin = window.location.origin;
      const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
      const origin = (() => {
        if (typeof configuredOrigin !== 'string' || configuredOrigin.trim().length === 0) {
          return currentOrigin;
        }
        try {
          const configured = new URL(configuredOrigin);
          const current = new URL(currentOrigin);
          if (configured.origin === current.origin) {
            return configured.origin;
          }
          return currentOrigin;
        } catch {
          return currentOrigin;
        }
      })();

      // メールアドレスの存在チェック
      const checkRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!checkRes.ok) {
        throw new Error('check_email_failed');
      }

      const { exists } = await checkRes.json();

      if (!exists) {
        const error: MagicLinkError = {
          code: 'EMAIL_NOT_FOUND',
          message: t('auth.login.error.email_not_found'),
          type: 'error_input',
        };

        setState('error_input');
        setBanner({ kind: 'error', messageKey: 'auth.login.error.email_not_found' });

        logInfo('auth.login.fail.not_found', {
          screen: 'LoginPage',
          method: 'magiclink',
        });

        onError?.(error);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${origin}${callbackPath}`,
        },
      });

      if (error) {
        const isAuthError = isSupabaseAuthError(error);
        const errorType: MagicLinkError['type'] = isAuthError ? 'error_auth' : 'error_network';

        const messageKey = isAuthError
          ? 'auth.login.error.auth'
          : 'auth.login.error.network';

        const magicError: MagicLinkError = {
          code: error.code ?? 'SUPABASE_ERROR',
          message: t(messageKey),
          type: errorType,
        };

        setState(errorType);
        setBanner({ kind: 'error', messageKey });

        logError(
          isAuthError
            ? 'auth.login.fail.supabase.auth'
            : 'auth.login.fail.supabase.network',
          {
            screen: 'LoginPage',
            method: 'magiclink',
            code: error.code,
          },
        );

        onError?.(magicError);
        return;
      }

      setState('sent');
      setBanner({ kind: 'info', messageKey: 'auth.login.magiclink_sent' });

      logInfo('auth.login.success.magiclink', {
        screen: 'LoginPage',
        method: 'magiclink',
      });

      onSent?.();
    } catch (err: any) {
      const magicError: MagicLinkError = {
        code: err?.code ?? 'UNEXPECTED',
        message: t('auth.login.error.unexpected'),
        type: 'error_unexpected',
      };

      setState('error_unexpected');
      setBanner({ kind: 'error', messageKey: 'auth.login.error.unexpected' });

      logError('auth.login.fail.unexpected', {
        screen: 'LoginPage',
        method: 'magiclink',
        reason: err?.message ?? 'unknown',
      });

      onError?.(magicError);
    }
  }, [email, onSent, onError, t]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await handleLogin();
    },
    [handleLogin],
  );

  const cardClassName = `${cardBaseClassName} ${
    state === 'sending' ? 'opacity-60 pointer-events-none' : ''
  } ${className ?? ''}`;

  return (
    <div className={cardClassName}>
      <div className="flex items-start gap-3">
        <MailIcon className="w-7 h-7 text-gray-500" aria-hidden="true" />
        <div className="flex-1">
          <h2 className="text-base font-medium text-gray-900">
            {t('auth.login.magiclink.title')}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {t('auth.login.magiclink.description')}
          </p>
        </div>
      </div>

      <form className="mt-4 space-y-3" onSubmit={handleSubmit} noValidate>
        <div>
          <label className="sr-only" htmlFor="email">
            {t('auth.login.email.label')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.login.email.placeholder')}
            className={emailInputClassName}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={state === 'sending'}
          />
        </div>

        <button type="submit" className={loginButtonClassName} disabled={state === 'sending'}>
          {state === 'sending'
            ? t('auth.login.magiclink.button_sending')
            : t('auth.login.magiclink.button_login')}
        </button>

        <div className="mt-3 min-h-[44px] flex items-start w-full justify-center">
          {banner && (
            <AuthErrorBanner
              kind={banner.kind}
              message={t(banner.messageKey)}
            />
          )}
        </div>
      </form>
    </div>
  );
};

function validateEmail(value: string): boolean {
  if (!value) return false;
  return /.+@.+\..+/.test(value);
}

function isSupabaseAuthError(error: { code?: string }): boolean {
  return !!error.code && !['NETWORK_ERROR', 'FETCH_ERROR'].includes(error.code);
}

export default MagicLinkForm;

