"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';

export interface MagicLinkError {
  code: string;
  message: string;
  type: 'error';
}

export interface MagicLinkFormProps {
  className?: string;
  passkeyEnabled?: boolean;
  onSent?: () => void;
  onError?: (error: MagicLinkError) => void;
}

type State = 'idle' | 'sending' | 'sent' | 'error';

export const MagicLinkForm: React.FC<MagicLinkFormProps> = ({ className, passkeyEnabled, onSent, onError }) => {
  const { t } = useStaticI18n();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  const isInvalidEmail = useMemo(() => !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), [email]);

  const handleError = useCallback((err: MagicLinkError) => {
    onError?.(err);
  }, [onError]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalidEmail) return; // input@Requiredに任せる
    setState('sending');

    try {
      // 1) Supabase Magic Link (primary)
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) {
        setState('error');
        handleError({ code: 'network_error', message: error.message ?? 'Network error', type: 'error' });
        return;
      }
      setState('sent');
      onSent?.();

      // 2) Optional: Passkey補助（WS-A01: passkeyEnabled時のみ、送信後に実行）
      if (passkeyEnabled && typeof window !== 'undefined' && (window as any).__CORBADO_MODE === 'success') {
        try {
          const mod = await import('@corbado/web-js');
          const Corbado = await (mod.default as any).load({ projectId: process.env.NEXT_PUBLIC_CORBADO_PROJECT_ID! } as any);
          const result: any = await Corbado.passkey.login({ identifier: email });
          const idToken: string | undefined = result?.id_token;
          if (idToken) {
            const { error: idErr } = await supabase.auth.signInWithIdToken({ provider: 'corbado', token: idToken });
            if (idErr) throw idErr;
            if (!(typeof window !== 'undefined' && (window as any).__NO_REDIRECT__)) {
              window.location.replace('/mypage');
            }
          }
        } catch (_e) {
          // passkey補助はベストエフォート。失敗してもMagicLinkの送信結果は保持
        }
      }
    } catch (err: any) {
      setState('error');
      handleError({ code: 'network_error', message: err?.message ?? 'Network error', type: 'error' });
    }
  }, [email, isInvalidEmail, handleError, onSent, passkeyEnabled]);

  return (
    <form onSubmit={onSubmit} className={`flex flex-col gap-4 ${className ?? ''}`}>
      <label htmlFor="email" className="text-sm font-medium text-gray-700">
        {t('auth.enter_email')}
      </label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@example.com"
        className="h-12 px-3 border rounded-2xl border-gray-300 focus:ring-2 focus:ring-blue-500"
        required
      />

      <button
        type="submit"
        disabled={state === 'sending'}
        className="h-12 rounded-2xl bg-blue-600 text-white font-medium disabled:opacity-60 transition"
      >
        {state === 'sending' ? t('auth.sending') : t('auth.send_magic_link')}
      </button>

      {state === 'sent' && (
        <p className="text-green-600 text-sm inline-flex items-center gap-2"><CheckCircle className="h-4 w-4" /> {t('auth.link_sent')}</p>
      )}
      {state === 'error' && (
        <p className="text-red-600 text-sm inline-flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {t('auth.error_generic')}</p>
      )}

      <div aria-live="polite" className="sr-only">
        {state === 'sending' ? t('auth.sending') : state === 'sent' ? t('auth.link_sent') : state === 'error' ? t('auth.error_generic') : ''}
      </div>
    </form>
  );
};

export default MagicLinkForm;
