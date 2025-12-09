"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';
import { AuthLoadingIndicator } from '@/src/components/common/AuthLoadingIndicator/AuthLoadingIndicator';
import { logInfo, logError } from '@/src/lib/logging/log.util';

export const AuthCallbackHandler: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    let handled = false;

    logInfo('auth.callback.start');

    const completeSuccess = () => {
      if (!mounted || handled) return;
      handled = true;
      logInfo('auth.callback.success');

      try {
        window.close();
      } catch {
        // ignore
      }
    };

    const completeFailure = (reason: string) => {
      if (!mounted || handled) return;
      handled = true;
      logError('auth.callback.fail.session', {
        reason,
      });
      router.replace('/login?error=auth_failed');
    };

    const href = window.location.href;
    logInfo('auth.callback.debug.url', {
      href,
    });

    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    const tokenHash = searchParams.get('token_hash');
    const errorDescription = searchParams.get('error_description') ?? searchParams.get('error');

    logInfo('auth.callback.debug.url_params', {
      search: url.search,
      hash: url.hash,
      hasTokenHash: !!tokenHash,
      error: errorDescription ?? null,
    });

    if (errorDescription) {
      completeFailure(errorDescription);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logInfo('auth.callback.onAuthStateChange', {
        event,
        hasSession: !!session,
      });

      if (event === 'SIGNED_IN' && session) {
        completeSuccess();
      }
    });

    const verifyFromUrl = async () => {
      if (!tokenHash) {
        return;
      }

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email',
        });

        logInfo('auth.callback.debug.verify_token_hash', {
          hasSession: !!data?.session,
          error: error?.message ?? null,
        });

        if (error) {
          completeFailure(error.message ?? 'verify_otp_failed');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logError('auth.callback.debug.verify_exception', {
          message,
        });
      }
    };

    void verifyFromUrl();

    const checkInitialSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      logInfo('auth.callback.debug.initial_getSession', {
        hasSession: !!data?.session,
        error: error?.message ?? null,
      });

      if (error) {
        completeFailure(error.message ?? 'unknown');
        return;
      }

      if (data?.session) {
        completeSuccess();
      }
    };

    void checkInitialSession();

    const timeoutId = window.setTimeout(async () => {
      if (!mounted || handled) return;

      const { data, error } = await supabase.auth.getSession();

      logInfo('auth.callback.debug.timeout_getSession', {
        hasSession: !!data?.session,
        error: error?.message ?? null,
      });

      if (error) {
        completeFailure(error.message ?? 'timeout_error');
        return;
      }

      if (data?.session) {
        completeSuccess();
      } else {
        completeFailure('timeout_no_session');
      }
    }, 5000);

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [router]);

  return <AuthLoadingIndicator label="Processing..." />;
};

export default AuthCallbackHandler;
