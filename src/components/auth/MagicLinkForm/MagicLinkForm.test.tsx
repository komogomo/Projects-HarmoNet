import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MagicLinkForm } from './MagicLinkForm';

jest.mock('../../../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      signInWithIdToken: jest.fn(),
    },
  },
}));

jest.mock('@corbado/web-js', () => {
  const load = jest.fn().mockResolvedValue({ passkey: { login: jest.fn() } });
  const defaultExport = { load };
  return { __esModule: true, default: defaultExport };
});

jest.mock('@/components/common/StaticI18nProvider/StaticI18nProvider', () => {
  const React = require('react');
  const Ctx = React.createContext({ t: (k: string) => k, currentLocale: 'en', setLocale: () => {} });
  return {
    StaticI18nProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useStaticI18n: () => React.useContext(Ctx),
  };
});

const supabaseMock = require('../../../../lib/supabaseClient').supabase;

describe('MagicLinkForm (WS-A01)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    delete (window as any).__CORBADO_MODE;
    delete (window as any).__NO_REDIRECT__;
  });

  it('T-A01-01: goes to sending state immediately after submit', async () => {
    // keep promise pending to hold sending
    (supabaseMock.auth.signInWithOtp as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<MagicLinkForm />);
    fireEvent.change(screen.getByLabelText('auth.enter_email'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button'));
    const sendingEls = await screen.findAllByText('auth.sending');
    expect(sendingEls.length).toBeGreaterThanOrEqual(1);
  });

  it('T-A01-02: sends magic link successfully (OTP success)', async () => {
    const mod = require('@corbado/web-js').default;
    mod.load.mockResolvedValueOnce({ passkey: { login: jest.fn().mockResolvedValue({ id_token: undefined }) } });
    (supabaseMock.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });

    render(<MagicLinkForm />);
    fireEvent.change(screen.getByLabelText('auth.enter_email'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button'));
    const sentEls = await screen.findAllByText('auth.link_sent');
    expect(sentEls.length).toBeGreaterThanOrEqual(1);
  });

  it('T-A01-03: handles error when OTP fails', async () => {
    const mod = require('@corbado/web-js').default;
    mod.load.mockResolvedValueOnce({ passkey: { login: jest.fn().mockResolvedValue({ id_token: undefined }) } });
    (supabaseMock.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({ data: {}, error: new Error('fail') });

    render(<MagicLinkForm />);
    fireEvent.change(screen.getByLabelText('auth.enter_email'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button'));
    const errEls = await screen.findAllByText('auth.error_generic');
    expect(errEls.length).toBeGreaterThanOrEqual(1);
  });

  it('T-A01-04: when passkeyEnabled and CORBADO success, signs in with id token after OTP', async () => {
    const mod = require('@corbado/web-js').default;
    mod.load.mockResolvedValueOnce({ passkey: { login: jest.fn().mockResolvedValue({ id_token: 'jwt' }) } });
    (supabaseMock.auth.signInWithOtp as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });
    (supabaseMock.auth.signInWithIdToken as jest.Mock).mockResolvedValueOnce({ data: {}, error: null });

    // mock window.location.replace to avoid navigation errors in test
    const originalLocation = window.location;
    const replaceSpy = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, replace: replaceSpy },
    });
    (window as any).__CORBADO_MODE = 'success';
    (window as any).__NO_REDIRECT__ = true;

    render(<MagicLinkForm passkeyEnabled />);
    fireEvent.change(screen.getByLabelText('auth.enter_email'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(supabaseMock.auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'corbado', token: 'jwt' });
    });

    // restore window.location
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('T-A01-05: supports i18n switching (key rendering)', async () => {
    render(<MagicLinkForm />);
    // keys are returned as-is by test provider; ensure component uses t() for label
    expect(screen.getByLabelText('auth.enter_email')).toBeInTheDocument();
  });
});
