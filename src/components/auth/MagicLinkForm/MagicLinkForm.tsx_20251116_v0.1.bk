"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';
import { SUCCESS_EMAIL_SENT, ERROR_INVALID_EMAIL, ERROR_NETWORK } from '@/src/components/common/messages/authMessages';

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

type MessageState = {
  type: 'none' | 'success' | 'error';
  message: string;
};

export const MagicLinkForm: React.FC<MagicLinkFormProps> = ({ className, passkeyEnabled, onSent, onError }) => {
  const { t } = useStaticI18n();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');
  const [messageState, setMessageState] = useState<MessageState>({ type: 'none', message: '' });

  const isInvalidEmail = useMemo(() => !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), [email]);

  const handleError = useCallback((err: MagicLinkError) => {
    onError?.(err);
  }, [onError]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // 独自バリデーション: 空欄はメッセージ非表示、不正形式はエラーメッセージ
    if (!email) {
      setMessageState({ type: 'none', message: '' });
      return;
    }
    if (isInvalidEmail) {
      setMessageState({ type: 'error', message: ERROR_INVALID_EMAIL });
      return;
    }

    setState('sending');
    setMessageState({ type: 'none', message: '' });

    try {
      // 1) Supabase Magic Link (primary)
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) {
        setState('error');
        handleError({ code: 'network_error', message: error.message ?? 'Network error', type: 'error' });
        setMessageState({ type: 'error', message: ERROR_NETWORK });
        return;
      }
      setState('sent');
      onSent?.();
      setMessageState({ type: 'success', message: SUCCESS_EMAIL_SENT });

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
      setMessageState({ type: 'error', message: ERROR_NETWORK });
    }
  }, [email, isInvalidEmail, handleError, onSent, passkeyEnabled]);

  return (
    <form noValidate onSubmit={onSubmit} className={`flex flex-col gap-4 ${className ?? ''}`}>
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
        className="
          h-12 rounded-2xl shadow-sm
          bg-[#6495ed] text-white
          flex items-center justify-center gap-2
          disabled:opacity-60
          hover:bg-[#5386d9] transition-all
        "
      >
        {state === 'sending' ? t('auth.sending') : t('auth.send_magic_link')}
      </button>

      <div className="min-h-[60px] flex items-center justify-center mt-2">
        {messageState.type !== 'none' && (
          <p
            className={
              messageState.type === 'success'
                ? 'text-green-600 text-sm inline-flex items-center gap-2 text-center'
                : 'text-red-600 text-sm inline-flex items-center gap-2 text-center'
            }
          >
            {messageState.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {messageState.message}
          </p>
        )}
      </div>

      <div aria-live="polite" className="sr-only">
        {state === 'sending' ? t('auth.sending') : state === 'sent' ? t('auth.link_sent') : state === 'error' ? t('auth.error_generic') : ''}
      </div>
    </form>
  );
};

export default MagicLinkForm;
