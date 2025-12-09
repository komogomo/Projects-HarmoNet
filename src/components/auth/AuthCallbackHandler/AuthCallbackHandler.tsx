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
      logInfo('auth.callback.redirect.home');
      router.replace('/home');
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
    const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(hash);

    const code = searchParams.get('code');
    const errorDescription = searchParams.get('error_description') ?? searchParams.get('error');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    logInfo('auth.callback.debug.url_params', {
      search: url.search,
      hash: url.hash,
      hasCode: !!code,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
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

    const exchangeFromUrl = async () => {
      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          logInfo('auth.callback.debug.exchange_code', {
            hasSession: !!data?.session,
            error: error?.message ?? null,
          });

          if (error) {
            return;
          }

          if (data?.session) {
            completeSuccess();
            return;
          }
        } else if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          logInfo('auth.callback.debug.set_session', {
            hasSession: !!data?.session,
            error: error?.message ?? null,
          });

          if (error) {
            return;
          }

          if (data?.session) {
            completeSuccess();
            return;
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logError('auth.callback.debug.exchange_exception', {
          message,
        });
      }
    };

    void exchangeFromUrl();

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
