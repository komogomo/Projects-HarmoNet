import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { MagicLinkForm } from './MagicLinkForm';

vi.mock('../../../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
    },
  },
}));

vi.mock('@/src/components/common/StaticI18nProvider/StaticI18nProvider', () => ({
  useStaticI18n: () => ({ t: (k: string) => k }),
}));

vi.mock('@/src/lib/logging/log.util', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

import { supabase } from '../../../../lib/supabaseClient';
import { logInfo, logError } from '@/src/lib/logging/log.util';

const supabaseMock = supabase;

describe('MagicLinkForm (A-01, v1.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-A01-01: succeeds with valid email and logs start/success events', async () => {
    (supabaseMock.auth.signInWithOtp as any).mockResolvedValueOnce({ data: {}, error: null });

    render(<MagicLinkForm />);

    fireEvent.change(screen.getByLabelText('auth.login.email.label'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(supabaseMock.auth.signInWithOtp).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('auth.login.magiclink_sent')).toBeInTheDocument();

    expect(logInfo).toHaveBeenCalledWith(
      'auth.login.start',
      expect.objectContaining({ method: 'magiclink' }),
    );
    expect(logInfo).toHaveBeenCalledWith(
      'auth.login.success.magiclink',
      expect.objectContaining({ method: 'magiclink' }),
    );
  });

  it('UT-A01-02: shows inline error and logs input failure for empty email', async () => {
    render(<MagicLinkForm />);

    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('auth.login.error.email_invalid')).toBeInTheDocument();
    expect(supabaseMock.auth.signInWithOtp).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      'auth.login.fail.input',
      expect.objectContaining({ method: 'magiclink' }),
    );
  });

  it('UT-A01-03: shows inline error and logs input failure for invalid email format', async () => {
    render(<MagicLinkForm />);

    fireEvent.change(screen.getByLabelText('auth.login.email.label'), {
      target: { value: 'invalid-email' },
    });
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('auth.login.error.email_invalid')).toBeInTheDocument();
    expect(supabaseMock.auth.signInWithOtp).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      'auth.login.fail.input',
      expect.objectContaining({ method: 'magiclink' }),
    );
  });

  it('UT-A01-04: handles Supabase network error and logs network failure', async () => {
    (supabaseMock.auth.signInWithOtp as any).mockResolvedValueOnce({
      data: {},
      error: { code: 'NETWORK_ERROR' },
    });

    render(<MagicLinkForm />);

    fireEvent.change(screen.getByLabelText('auth.login.email.label'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('auth.login.error.network')).toBeInTheDocument();
    expect(logError).toHaveBeenCalledWith(
      'auth.login.fail.supabase.network',
      expect.objectContaining({ method: 'magiclink' }),
    );
  });

  it('UT-A01-05: handles Supabase auth error and logs auth failure', async () => {
    (supabaseMock.auth.signInWithOtp as any).mockResolvedValueOnce({
      data: {},
      error: { code: 'invalid_credentials' },
    });

    render(<MagicLinkForm />);

    fireEvent.change(screen.getByLabelText('auth.login.email.label'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('auth.login.error.auth')).toBeInTheDocument();
    expect(logError).toHaveBeenCalledWith(
      'auth.login.fail.supabase.auth',
      expect.objectContaining({ method: 'magiclink' }),
    );
  });

  it('UT-A01-06: handles unexpected error and logs unexpected failure', async () => {
    (supabaseMock.auth.signInWithOtp as any).mockRejectedValueOnce(new Error('boom'));

    render(<MagicLinkForm />);

    fireEvent.change(screen.getByLabelText('auth.login.email.label'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('auth.login.error.unexpected')).toBeInTheDocument();
    expect(logError).toHaveBeenCalledWith(
      'auth.login.fail.unexpected',
      expect.objectContaining({ method: 'magiclink' }),
    );
  });

  it('UT-A01-07: uses i18n keys for label text', () => {
    render(<MagicLinkForm />);
    expect(screen.getByLabelText('auth.login.email.label')).toBeInTheDocument();
  });
});
