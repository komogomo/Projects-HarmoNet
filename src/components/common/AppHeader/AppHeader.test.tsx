import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppHeader } from './AppHeader';
import { StaticI18nProvider } from '@/src/components/common/StaticI18nProvider';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => '/login',
}));

jest.mock('lucide-react', () => ({
  ChevronDown: (props: any) => <span {...props} />,
  Check: (props: any) => <span {...props} />,
}));

function renderWithProvider(ui: React.ReactElement) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('selectedLanguage', 'ja');
  }
  return render(<StaticI18nProvider>{ui}</StaticI18nProvider>);
}

beforeEach(() => {
  // Mock fetch for i18n JSON
  (globalThis as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({
    common: {
      language: 'Language',
      save: 'Save',
      cancel: 'Cancel',
      copyright: '© 2025 HarmoNet. All rights reserved.'
    }
  }) });
});

describe('AppHeader', () => {
  it('ログインバリアントでロゴと言語切替のみ表示', () => {
    renderWithProvider(<AppHeader variant="login" />);

    expect(screen.getByAltText('HarmoNet')).toBeInTheDocument();
    expect(screen.getByTestId('app-header-language-switch')).toBeInTheDocument();
    expect(screen.queryByTestId('app-header-notification')).not.toBeInTheDocument();
  });

  it('認証バリアントで通知アイコンも表示', () => {
    renderWithProvider(<AppHeader variant="authenticated" />);

    expect(screen.getByAltText('HarmoNet')).toBeInTheDocument();
    expect(screen.getByTestId('app-header-notification')).toBeInTheDocument();
    expect(screen.getByTestId('app-header-language-switch')).toBeInTheDocument();
  });

  it('セマンティックHTMLが適切に設定されている', () => {
    renderWithProvider(<AppHeader />);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });
});
