"use client";

import React, { useCallback, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useStaticI18n } from '@/components/common/StaticI18nProvider/StaticI18nProvider';

type State = 'idle' | 'sending' | 'sent' | 'error_invalid' | 'error_network';

export const MagicLinkForm: React.FC = () => {
  const { t } = useStaticI18n();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setState('error_invalid');
      return;
    }
    setState('sending');
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setState('error_network');
        return;
      }
      setState('sent');
    } catch (_) {
      setState('error_network');
    }
  }, [email]);

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          {t('auth.enter_email')}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="name@example.com"
          aria-invalid={state === 'error_invalid'}
        />
      </div>
      <button
        type="submit"
        disabled={state === 'sending'}
        className="mx-auto flex w-fit items-center justify-center rounded-md bg-[hsl(var(--hn-primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--hn-primary-foreground))] disabled:opacity-50"
      >
        <span className="inline-flex items-center gap-2">
          {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t('auth.send_magic_link')}
        </span>
      </button>

      {state === 'sent' && (
        <p className="mx-auto flex items-center justify-center gap-2 text-green-600 text-sm text-center"><CheckCircle className="h-4 w-4" /> {t('auth.email_sent')}</p>
      )}
      {state === 'error_invalid' && (
        <p className="mx-auto flex items-center justify-center gap-2 text-red-600 text-sm text-center"><AlertCircle className="h-4 w-4" /> {t('auth.invalid_email')}</p>
      )}
      {state === 'error_network' && (
        <p className="mx-auto flex items-center justify-center gap-2 text-red-600 text-sm text-center"><AlertCircle className="h-4 w-4" /> {t('auth.network_error')}</p>
      )}
    </form>
  );
};

export default MagicLinkForm;
