import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { PasskeyAuthTrigger } from './PasskeyAuthTrigger';

vi.mock('../../../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithIdToken: vi.fn(),
    },
  },
}));

vi.mock('@corbado/web-js', () => {
  const load = vi.fn();
  const defaultExport = { load };
  return { __esModule: true, default: defaultExport };
});

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
import CorbadoModule from '@corbado/web-js';
import { logInfo, logError } from '@/src/lib/logging/log.util';

const supabaseMock = supabase;
const corbadoModule = CorbadoModule as any;

describe('PasskeyAuthTrigger (A-02, v1.3)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    const locationMock = { ...originalLocation, href: '' } as Location & { href: string };
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: locationMock,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('UT-A02-01: 認証成功 → success と /mypage 遷移とログ出力', async () => {
    corbadoModule.load.mockResolvedValueOnce({
      passkey: { login: jest.fn().mockResolvedValue({ id_token: 'jwt' }) },
    });
    (supabaseMock.auth.signInWithIdToken as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });

    render(<PasskeyAuthTrigger />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(supabaseMock.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'corbado',
        token: 'jwt',
      });
    });

    expect((window.location as any).href).toBe('/mypage');

    expect(logInfo).toHaveBeenCalledWith(
      'auth.login.start',
      expect.objectContaining({ method: 'passkey' }),
    );
    expect(logInfo).toHaveBeenCalledWith(
      'auth.login.success.passkey',
      expect.objectContaining({ screen: 'LoginPage' }),
    );
  });

  it('UT-A02-02: NotAllowedError → error_denied とバナー表示', async () => {
    const error = new Error('cancel');
    (error as any).name = 'NotAllowedError';
    corbadoModule.load.mockResolvedValueOnce({
      passkey: { login: jest.fn().mockRejectedValue(error) },
    });

    render(<PasskeyAuthTrigger />);

    fireEvent.click(screen.getByRole('button'));

    expect(
      await screen.findByText('auth.login.passkey.error_denied'),
    ).toBeInTheDocument();

    expect(logError).toHaveBeenCalledWith(
      'auth.login.fail.passkey.denied',
      expect.objectContaining({ screen: 'LoginPage' }),
    );
  });

  it('UT-A02-03: ORIGIN を含むメッセージ → error_origin', async () => {
    const error = new Error('ORIGIN mismatch');
    corbadoModule.load.mockResolvedValueOnce({
      passkey: { login: jest.fn().mockRejectedValue(error) },
    });

    render(<PasskeyAuthTrigger />);

    fireEvent.click(screen.getByRole('button'));

    expect(
      await screen.findByText('auth.login.passkey.error_origin'),
    ).toBeInTheDocument();

    expect(logError).toHaveBeenCalledWith(
      'auth.login.fail.passkey.origin',
      expect.objectContaining({ screen: 'LoginPage' }),
    );
  });

  it('UT-A02-04: NETWORK を含むメッセージ → error_network', async () => {
    const error = new Error('NETWORK failure');
    corbadoModule.load.mockResolvedValueOnce({
      passkey: { login: jest.fn().mockRejectedValue(error) },
    });

    render(<PasskeyAuthTrigger />);

    fireEvent.click(screen.getByRole('button'));

    expect(
      await screen.findByText('auth.login.passkey.error_network'),
    ).toBeInTheDocument();

    expect(logError).toHaveBeenCalledWith(
      'auth.login.fail.passkey.network',
      expect.objectContaining({ screen: 'LoginPage' }),
    );
  });

  it('UT-A02-05: code を持つエラー → error_auth', async () => {
    const authError = { code: 'AUTH_ERROR', message: 'auth error' };
    corbadoModule.load.mockResolvedValueOnce({
      passkey: {
        login: jest.fn().mockResolvedValue({ id_token: 'jwt' }),
      },
    });
    (supabaseMock.auth.signInWithIdToken as jest.Mock).mockResolvedValueOnce({
      data: {},
      error: authError,
    });

    render(<PasskeyAuthTrigger />);

    fireEvent.click(screen.getByRole('button'));

    expect(
      await screen.findByText('auth.login.passkey.error_auth'),
    ).toBeInTheDocument();

    expect(logError).toHaveBeenCalledWith(
      'auth.login.fail.passkey.auth',
      expect.objectContaining({ screen: 'LoginPage', code: 'AUTH_ERROR' }),
    );
  });

  it('UT-A02-06: 想定外エラー → error_unexpected', async () => {
    const error = new Error('something unexpected');
    corbadoModule.load.mockResolvedValueOnce({
      passkey: { login: jest.fn().mockRejectedValue(error) },
    });

    render(<PasskeyAuthTrigger />);

    fireEvent.click(screen.getByRole('button'));

    expect(
      await screen.findByText('auth.login.passkey.error_unexpected'),
    ).toBeInTheDocument();

    expect(logError).toHaveBeenCalledWith(
      'auth.login.fail.passkey.unexpected',
      expect.objectContaining({ screen: 'LoginPage' }),
    );
  });

  it('UT-A02-07: i18n キーがそのまま使用されていることを確認', () => {
    render(<PasskeyAuthTrigger />);

    expect(
      screen.getByText('auth.login.passkey.title'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('auth.login.passkey.description'),
    ).toBeInTheDocument();
  });
});
