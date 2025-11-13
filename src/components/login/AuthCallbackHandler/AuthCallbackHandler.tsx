"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import { AuthLoadingIndicator } from '@/src/components/common/AuthLoadingIndicator/AuthLoadingIndicator';
import { AlertCircle } from 'lucide-react';

type State = 'loading' | 'success' | 'error';

export const AuthCallbackHandler: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setState('error');
      return;
    }
    const run = async () => {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        setState('success');
        router.replace('/mypage');
      } catch (_) {
        setState('error');
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'loading') {
    return <AuthLoadingIndicator label="Processing..." />;
  }
  if (state === 'error') {
    return (
      <div className="rounded-md border border-destructive bg-background p-4 text-destructive">
        <p className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4" /> Authentication failed</p>
      </div>
    );
  }
  return null;
};

export default AuthCallbackHandler;
