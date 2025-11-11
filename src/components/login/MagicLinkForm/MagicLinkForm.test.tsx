import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MagicLinkForm } from './MagicLinkForm';

jest.mock('../../../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
    },
  },
}));

// Minimal provider shim since layout wrapper isn't present in unit test
jest.mock('@/components/common/StaticI18nProvider/StaticI18nProvider', () => {
  const React = require('react');
  const Ctx = React.createContext({ t: (k: string) => k, currentLocale: 'en', setLocale: () => {} });
  return {
    StaticI18nProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useStaticI18n: () => React.useContext(Ctx),
  };
});

const supabaseMock = require('../../../../lib/supabaseClient').supabase;

describe('MagicLinkForm', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows invalid error when email is empty or invalid (UT01)', async () => {
    render(<MagicLinkForm />);
    const submit = screen.getByRole('button');
    fireEvent.click(submit);
    expect(await screen.findByText('auth.invalid_email')).toBeInTheDocument();
  });

  it('sends magic link successfully (UT02)', async () => {
    supabaseMock.auth.signInWithOtp.mockResolvedValueOnce({ data: {}, error: null });
    render(<MagicLinkForm />);
    fireEvent.change(screen.getByLabelText('auth.enter_email'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('auth.email_sent')).toBeInTheDocument();
  });

  it('handles network error (UT03)', async () => {
    supabaseMock.auth.signInWithOtp.mockResolvedValueOnce({ data: {}, error: new Error('fail') });
    render(<MagicLinkForm />);
    fireEvent.change(screen.getByLabelText('auth.enter_email'), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('auth.network_error')).toBeInTheDocument();
  });
});
