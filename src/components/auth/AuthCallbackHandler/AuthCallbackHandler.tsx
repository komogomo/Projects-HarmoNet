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

    const normalizeNextPath = (value: string | null): string | null => {
      if (!value) return null;
      if (!value.startsWith('/')) return null;
      if (value.startsWith('//')) return null;
      return value;
    };

    logInfo('auth.callback.start');

    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const readCookie = (name: string): string | null => {
      try {
        const parts = document.cookie.split(';').map((p) => p.trim());
        for (const part of parts) {
          if (!part.startsWith(`${name}=`)) continue;
          return decodeURIComponent(part.slice(name.length + 1));
        }
        return null;
      } catch {
        return null;
      }
    };

    const clearCookie = (name: string) => {
      const isHttps = window.location.protocol === 'https:';
      document.cookie = [
        `${name}=`,
        'Path=/',
        'Max-Age=0',
        'SameSite=Lax',
        isHttps ? 'Secure' : '',
      ]
        .filter(Boolean)
        .join('; ');
    };

    const nextPathFromQuery = normalizeNextPath(searchParams.get('next'));
    const nextPathFromCookie = normalizeNextPath(readCookie('hn_post_auth_next'));
    const nextPath = nextPathFromQuery ?? nextPathFromCookie;
    const isSysAdminFlow = typeof nextPath === 'string' && nextPath.startsWith('/sys-admin');

    const tokenHash = searchParams.get('token_hash');
    const code = searchParams.get('code');

    logInfo('auth.callback.url_inspect', {
      hasCode: !!code,
      hasTokenHash: !!tokenHash,
      hasHash: typeof window.location.hash === 'string' && window.location.hash.length > 0,
      nextPathSource: nextPathFromQuery ? 'query' : nextPathFromCookie ? 'cookie' : 'none',
      isSysAdminFlow,
    });

    const completeSuccess = () => {
      if (!mounted || handled) return;
      handled = true;
      logInfo('auth.callback.success');

      clearCookie('hn_post_auth_next');

      router.replace(nextPath ?? '/home');
    };

    const completeFailure = (reason: string) => {
      if (!mounted || handled) return;
      handled = true;
      logError('auth.callback.fail.session', {
        reason,
      });

      clearCookie('hn_post_auth_next');
      router.replace(isSysAdminFlow ? '/sys-admin/login?error=auth_failed' : '/login?error=auth_failed');
    };

    const errorDescription = searchParams.get('error_description') ?? searchParams.get('error');

    if (errorDescription) {
      completeFailure(errorDescription);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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

        if (error) {
          completeFailure(error.message ?? 'verify_otp_failed');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logError('auth.callback.fail.verify_exception', {
          message,
        });
      }
    };

    void verifyFromUrl();

    const checkInitialSession = async () => {
      const { data, error } = await supabase.auth.getSession();

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
