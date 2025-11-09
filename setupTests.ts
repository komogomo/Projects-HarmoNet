import '@testing-library/jest-dom';
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
if (!(globalThis as any).fetch) {
  (globalThis as any).fetch = jest.fn().mockResolvedValue({
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
