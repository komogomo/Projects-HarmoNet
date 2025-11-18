import React from 'react';
import { render, waitFor } from '@testing-library/react';
import AuthCallbackHandler from './AuthCallbackHandler';

const replaceMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

jest.mock('../../../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const supabaseMock = require('../../../../lib/supabaseClient').supabase;

describe('AuthCallbackHandler', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('redirects to /home when session exists', async () => {
    supabaseMock.auth.getSession.mockResolvedValueOnce({
      data: { session: {} },
      error: null,
    });

    render(<AuthCallbackHandler />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/home');
    });
  });

  it('redirects to /login when session is missing', async () => {
    supabaseMock.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    render(<AuthCallbackHandler />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login?error=auth_failed');
    });
  });

  it('redirects to /login when getSession returns error', async () => {
    supabaseMock.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('bad'),
    });

    render(<AuthCallbackHandler />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/login?error=auth_failed');
    });
  });
});
