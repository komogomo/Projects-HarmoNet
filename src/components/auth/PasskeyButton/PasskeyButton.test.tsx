import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasskeyButton } from './PasskeyButton';

jest.mock('../../../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
    },
  },
}));

jest.mock('@/src/components/common/StaticI18nProvider/StaticI18nProvider', () => {
  const React = require('react');
  const Ctx = React.createContext({ t: (k: string) => k, currentLocale: 'en', setLocale: () => {} });
  return {
    StaticI18nProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useStaticI18n: () => React.useContext(Ctx),
  };
});

const supabaseMock = require('../../../../lib/supabaseClient').supabase;

describe('PasskeyButton', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (window as any).corbado = { passkey: { login: jest.fn() } };
  });

  it('success flow triggers onSuccess (UT01)', async () => {
    (window as any).corbado.passkey.login.mockResolvedValueOnce('idtoken');
    supabaseMock.auth.signInWithIdToken.mockResolvedValueOnce({ data: {}, error: null });

    const onSuccess = jest.fn();
    render(<PasskeyButton onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText(/Success/i)).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('auth error updates state and calls onError (UT02)', async () => {
    (window as any).corbado.passkey.login.mockResolvedValueOnce('idtoken');
    supabaseMock.auth.signInWithIdToken.mockResolvedValueOnce({ data: {}, error: new Error('bad') });

    const onError = jest.fn();
    render(<PasskeyButton onError={onError} />);
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText(/save/i)).toBeInTheDocument();
    expect(onError).toHaveBeenCalled();
  });

  it('handles missing token as error (UT03)', async () => {
    (window as any).corbado.passkey.login.mockResolvedValueOnce(undefined);

    render(<PasskeyButton />);
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText(/save/i)).toBeInTheDocument();
  });

  it('shows loading state (UT04)', async () => {
    (window as any).corbado.passkey.login.mockImplementationOnce(() => new Promise(() => {}));

    render(<PasskeyButton />);
    fireEvent.click(screen.getByRole('button'));

    expect(await screen.findByText(/Loading/i)).toBeInTheDocument();
  });

  it('prevents re-click while loading (UT05)', async () => {
    (window as any).corbado.passkey.login.mockImplementationOnce(() => new Promise(() => {}));

    render(<PasskeyButton />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
  });
});
