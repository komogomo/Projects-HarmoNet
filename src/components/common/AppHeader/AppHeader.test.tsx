import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppHeader } from './AppHeader';
import { StaticI18nProvider } from '@/src/components/common/StaticI18nProvider';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: pushMock }),
  usePathname: () => '/login',
}));

jest.mock('lucide-react', () => ({
  ChevronDown: (props: any) => <span {...props} />,
  Check: (props: any) => <span {...props} />,
  Bell: (props: any) => <span {...props} />,
}));

function renderWithProvider(ui: React.ReactElement) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('selectedLanguage', 'ja');
  }
  return render(<StaticI18nProvider>{ui}</StaticI18nProvider>);
}

beforeEach(() => {
  // Mock fetch for i18n JSON and notification API (default: hasUnread = false)
  (globalThis as any).fetch = jest.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('/api/board/notifications/has-unread')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ hasUnread: false }),
      } as any);
    }

    return Promise.resolve({
      ok: true,
      json: async () => ({
        common: {
          language: 'Language',
          save: 'Save',
          cancel: 'Cancel',
          copyright: '© 2025 HarmoNet. All rights reserved.',
        },
        home: {
          noticeSection: {
            title: 'Latest notices',
            emptyMessage: 'There are no notices to display.',
            badge: 'Notice',
          },
        },
      }),
    } as any);
  });

  pushMock.mockClear();
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

  it('未読がある場合に通知バッジが表示される', async () => {
    // Override only the notification endpoint to return hasUnread = true
    (globalThis as any).fetch = jest.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/board/notifications/has-unread')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ hasUnread: true }),
        } as any);
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          common: {
            language: 'Language',
            save: 'Save',
            cancel: 'Cancel',
            copyright: '© 2025 HarmoNet. All rights reserved.',
          },
          home: {
            noticeSection: {
              title: 'Latest notices',
              emptyMessage: 'There are no notices to display.',
              badge: 'Notice',
            },
          },
        }),
      } as any);
    });

    renderWithProvider(<AppHeader variant="authenticated" />);

    expect(await screen.findByTestId('app-header-notification-badge')).toBeInTheDocument();
  });

  it('セマンティックHTMLが適切に設定されている', () => {
    renderWithProvider(<AppHeader />);

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });
});
