import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AuthCallbackHandler from './AuthCallbackHandler';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => {
    const params = new URLSearchParams(globalThis.location.search);
    return { get: (k: string) => params.get(k) } as any;
  },
}));

jest.mock('../../../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

const supabaseMock = require('../../../../lib/supabaseClient').supabase;

describe('AuthCallbackHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows error when no code in URL', async () => {
    delete (global as any).location;
    (global as any).location = { search: '' } as any;

    render(<AuthCallbackHandler />);
    expect(await screen.findByText(/Authentication failed/i)).toBeInTheDocument();
  });

  it('redirects on success', async () => {
    delete (global as any).location;
    (global as any).location = { search: '?code=abc' } as any;

    supabaseMock.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: null });

    render(<AuthCallbackHandler />);
    await waitFor(() => {
      // component returns null after redirect, so ensure no error banner
      expect(screen.queryByText(/Authentication failed/i)).toBeNull();
    });
  });

  it('shows error on failure', async () => {
    delete (global as any).location;
    (global as any).location = { search: '?code=abc' } as any;

    supabaseMock.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: new Error('bad') });

    render(<AuthCallbackHandler />);
    expect(await screen.findByText(/Authentication failed/i)).toBeInTheDocument();
  });
});
