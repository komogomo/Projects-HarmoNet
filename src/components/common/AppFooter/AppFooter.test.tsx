import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppFooter } from './AppFooter';
import { StaticI18nProvider } from '@/src/components/common/StaticI18nProvider';

function renderWithProvider(ui: React.ReactElement, locale: 'ja' | 'en' | 'zh' = 'ja') {
  return render(<StaticI18nProvider initialLocale={locale}>{ui}</StaticI18nProvider>);
}

beforeEach(() => {
  (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({
    common: {
      language: 'Language',
      save: 'Save',
      cancel: 'Cancel',
      copyright: '© 2025 HarmoNet. All rights reserved.'
    }
  }) });
});

// act 警告は setupTests.ts で選択的にサプレッション済み

describe('AppFooter', () => {
  it('T-C04-01: ', async () => {
    renderWithProvider(<AppFooter />,'en');
    expect(await screen.findByText('© 2025 HarmoNet. All rights reserved.')).toBeInTheDocument();
  });

  it('T-C04-02: ', () => {
    renderWithProvider(<AppFooter />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('T-C04-03: className適用', () => {
    renderWithProvider(<AppFooter className="bg-red-100 test-class" />);
    const el = screen.getByRole('contentinfo');
    expect(el).toHaveClass('test-class');
  });

  it('T-C04-04: testId適用', () => {
    renderWithProvider(<AppFooter testId="my-footer" />);
    expect(screen.getByTestId('my-footer')).toBeInTheDocument();
  });

  it('T-C04-05: スタイル適用（fixed/bottom-0/bg-white 等）', () => {
    renderWithProvider(<AppFooter />);
    const el = screen.getByRole('contentinfo');
    expect(el).toHaveClass('fixed');
    expect(el).toHaveClass('bottom-0');
    expect(el).toHaveClass('bg-white');
    expect(el).toHaveClass('border-t');
    expect(el).toHaveClass('border-gray-200');
    expect(el).toHaveClass('z-[900]');
    expect(el).toHaveClass('text-xs');
    expect(el).toHaveClass('text-gray-400');
  });
});
