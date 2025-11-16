import '@testing-library/jest-dom';
// Map Vitest's vi to jest for compatibility when running under Vitest
if (!(globalThis as any).jest && (globalThis as any).vi) {
  (globalThis as any).jest = (globalThis as any).vi;
}

// Provide default Supabase env vars for tests so that supabaseClient can be constructed safely
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
}

// Silence noisy React act() warnings from async state in tests only
const originalError = console.error;
console.error = (...args: any[]) => {
  const msg = args[0];
  if (typeof msg === 'string' && msg.includes('not wrapped in act(')) {
    return;
  }
  originalError(...args);
};

// Silence specific i18n missing key warnings
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = args[0];
  if (typeof msg === 'string' && msg.startsWith('[i18n] Missing key:')) {
    return;
  }
  originalWarn(...args);
};
// Provide a default fetch mock for i18n JSON; individual tests can override
const testMocker = (globalThis as any).jest ?? (globalThis as any).vi;
if (!(globalThis as any).fetch && testMocker?.fn) {
  (globalThis as any).fetch = testMocker.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      common: {
        language: 'Language',
        save: 'Save',
        cancel: 'Cancel',
        copyright: '© 2025 HarmoNet. All rights reserved.',
      },
    }),
  });
}
