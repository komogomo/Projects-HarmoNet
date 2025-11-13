"use client";

import React, { useCallback, useState } from 'react';
import { Loader2, CheckCircle, KeyRound } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';

export type PasskeyButtonProps = {
  onSuccess?: () => void;
  onError?: (e: unknown) => void;
};

type State = 'idle' | 'loading' | 'success' | 'error_auth';

export const PasskeyButton: React.FC<PasskeyButtonProps> = ({ onSuccess, onError }) => {
  const { t } = useStaticI18n();
  const [state, setState] = useState<State>('idle');

  const handleClick = useCallback(async () => {
    setState('loading');
    try {
      // Corbado Web SDK assumed global import; tests will mock this
      const token = await (window as any).corbado?.passkey?.login();
      if (!token) throw new Error('No token');
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'corbado', token });
      if (error) throw error;
      setState('success');
      onSuccess?.();
    } catch (e) {
      setState('error_auth');
      onError?.(e);
    }
  }, [onError, onSuccess]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'loading'}
      className="mx-auto flex w-fit items-center justify-center rounded-md bg-[hsl(var(--hn-primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--hn-primary-foreground))] disabled:opacity-50"
    >
      {state === 'loading' ? (
        <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading</span>
      ) : state === 'success' ? (
        <span className="inline-flex items-center gap-2 text-green-700"><CheckCircle className="h-4 w-4" /> Success</span>
      ) : (
        <span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4" /> {t('common.save')}</span>
      )}
    </button>
  );
};

export default PasskeyButton;
