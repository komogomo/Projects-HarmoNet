"use client";

import React, { useCallback, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';
import { logInfo, logError } from '@/src/lib/logging/log.util';
import type {
  PasskeyAuthError,
  PasskeyAuthTriggerProps,
  PasskeyAuthState,
} from './PasskeyAuthTrigger.types';

type BannerState = {
  kind: 'info' | 'error';
  messageKey: string;
} | null;

const cardBaseClassName =
  'rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.06)] border border-gray-100 bg-white px-4 py-4';

const AuthErrorBanner: React.FC<{ kind: 'info' | 'error'; message: string }> = ({ kind, message }) => {
  if (!message) return null;
  const base = 'mt-3 rounded-2xl px-3 py-2 text-sm flex items-start gap-2';
  const palette = kind === 'info' ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-700';
  return (
    <div className={`${base} ${palette}`} role={kind === 'error' ? 'alert' : 'status'} aria-live="polite">
      <span className="flex-1">{message}</span>
    </div>
  );
};

export const PasskeyAuthTrigger: React.FC<PasskeyAuthTriggerProps> = ({
  className,
  onSuccess,
  onError,
  testId,
}) => {
  const { t } = useStaticI18n();
  const [state, setState] = useState<PasskeyAuthState>('idle');
  const [banner, setBanner] = useState<BannerState>(null);

  const handlePasskey = useCallback(async () => {
    setState('processing');
    setBanner(null);

    logInfo('auth.login.start', {
      screen: 'LoginPage',
      method: 'passkey',
    });

    try {
      const mod = await import('@corbado/web-js');
      const Corbado: any = await (mod.default as any).load({
        projectId: process.env.NEXT_PUBLIC_CORBADO_PROJECT_ID!,
      });

      const result: any = await Corbado.passkey.login();
      if (!result?.id_token) {
        throw new Error('NO_TOKEN');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'corbado',
        token: result.id_token,
      });

      if (error) {
        throw error;
      }

      logInfo('auth.login.success.passkey', {
        screen: 'LoginPage',
      });

      setState('success');
      onSuccess?.();
      window.location.href = '/mypage';
    } catch (err: any) {
      const classified = classifyError(err, t);
      const messageKey = resolvePasskeyMessageKey(classified.type);

      setState(classified.type);
      setBanner({ kind: 'error', messageKey });

      logError(`auth.login.fail.passkey.${classified.type.replace('error_', '')}`, {
        screen: 'LoginPage',
        code: classified.code,
      });

      onError?.(classified);
    }
  }, [onSuccess, onError, t]);

  const cardClassName = `${cardBaseClassName} ${
    state === 'processing' ? 'opacity-60 pointer-events-none' : ''
  } ${className ?? ''}`;

  return (
    <div
      className={cardClassName}
      data-testid={testId}
      onClick={handlePasskey}
      role="button"
      aria-busy={state === 'processing'}
    >
      <div className="flex items-start gap-3">
        <KeyRound className="w-7 h-7 text-gray-500" aria-hidden="true" />
        <div>
          <h2 className="text-base font-medium text-gray-900">
            {t('auth.login.passkey.title')}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {t('auth.login.passkey.description')}
          </p>
        </div>
      </div>

      {banner && <AuthErrorBanner kind={banner.kind} message={t(banner.messageKey)} />}
    </div>
  );
};

function classifyError(err: any, t: (k: string) => string): PasskeyAuthError {
  if (err?.name === 'NotAllowedError') {
    return {
      code: 'NOT_ALLOWED',
      type: 'error_denied',
      message: t('auth.login.passkey.error_denied'),
    };
  }

  if (String(err?.message).includes('ORIGIN')) {
    return {
      code: 'ORIGIN',
      type: 'error_origin',
      message: t('auth.login.passkey.error_origin'),
    };
  }

  if (String(err?.message).includes('NETWORK')) {
    return {
      code: 'NETWORK',
      type: 'error_network',
      message: t('auth.login.passkey.error_network'),
    };
  }

  if (err?.code) {
    return {
      code: err.code,
      type: 'error_auth',
      message: t('auth.login.passkey.error_auth'),
    };
  }

  return {
    code: 'UNEXPECTED',
    type: 'error_unexpected',
    message: t('auth.login.passkey.error_unexpected'),
  };
}

function resolvePasskeyMessageKey(type: PasskeyAuthError['type']): string {
  switch (type) {
    case 'error_denied':
      return 'auth.login.passkey.error_denied';
    case 'error_origin':
      return 'auth.login.passkey.error_origin';
    case 'error_network':
      return 'auth.login.passkey.error_network';
    case 'error_auth':
      return 'auth.login.passkey.error_auth';
    case 'error_unexpected':
    default:
      return 'auth.login.passkey.error_unexpected';
  }
}

export default PasskeyAuthTrigger;
