"use client";

import React, { useCallback, useState } from 'react';
import { KeyRound } from 'lucide-react';
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

    console.log('[passkey-debug] button clicked');

    try {
      const mod = await import('@corbado/web-js');
      const Corbado: any = (mod as any).Corbado ?? (mod as any).default;

      console.log('[passkey-debug] Corbado module keys:', Object.keys(mod || {}));
      console.log('[passkey-debug] Corbado keys:', Corbado ? Object.keys(Corbado) : []);
      console.log('[passkey-debug] Corbado.load type:', typeof Corbado?.load);
      console.log('[passkey-debug] Corbado.passkey type:', typeof (Corbado as any)?.passkey);

      if (!Corbado || typeof Corbado.load !== 'function') {
        throw new Error('CORBADO_SDK_LOAD_NOT_FOUND');
      }

      await Corbado.load({
        projectId: process.env.NEXT_PUBLIC_CORBADO_PROJECT_ID!,
      });

      const openPasskeyLogin: any =
        (Corbado as any).openPasskeyLogin ?? (Corbado as any).startPasskeyLogin;
      if (!openPasskeyLogin || typeof openPasskeyLogin !== 'function') {
        throw new Error('CORBADO_SDK_HOSTED_FLOW_NOT_FOUND');
      }

      const result: any = await openPasskeyLogin();
      console.log('[passkey-debug] result', result);
      const idToken = result?.id_token as string | undefined;

      console.log('[passkey-debug] idToken length:', idToken ? idToken.length : 0);

      if (!idToken) {
        throw new Error('NO_TOKEN');
      }

      const resp = await fetch('/api/auth/passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const responseBody: any = await resp.json().catch(() => ({}));
      console.log('[passkey-debug] /api/auth/passkey:', resp.status, responseBody);

      if (!(resp.ok && responseBody?.status === 'ok')) {
        console.error('[passkey-debug] server returned error', responseBody);
        throw new Error(responseBody?.message || responseBody?.code || 'server_error');
      }

      logInfo('auth.login.success.passkey', {
        screen: 'LoginPage',
      });

      setState('success');
      onSuccess?.();
      window.location.href = '/mypage';
    } catch (err: any) {
      console.error('[passkey-debug] client error:', err);

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
