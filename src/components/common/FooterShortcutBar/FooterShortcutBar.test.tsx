import React from 'react';
import { render, screen } from '@testing-library/react';
import { FooterShortcutBar } from './FooterShortcutBar';
import { StaticI18nProvider } from '@/components/common/StaticI18nProvider';

jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children, ...props }: any) => (
  <a href={href} {...props}>{children}</a>
)}));

jest.mock('lucide-react', () => ({
  MessageSquare: (props: any) => <span {...props} />,
  Calendar: (props: any) => <span {...props} />,
  ClipboardList: (props: any) => <span {...props} />,
  User: (props: any) => <span {...props} />,
  Settings: (props: any) => <span {...props} />,
  Users: (props: any) => <span {...props} />,
  FileText: (props: any) => <span {...props} />,
}));

const mockPathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

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
    },
    shortcut: {
      board: 'Board',
      booking: 'Booking',
      survey: 'Survey',
      mypage: 'My Page',
      settings: 'Settings',
      tenants: 'Tenants',
      logs: 'Logs',
    }
  }) });
  mockPathname.mockReset().mockReturnValue('/');
});

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock | undefined)?.mockRestore?.();
});

describe('FooterShortcutBar', () => {
  it('T-C05-01: 権限別表示（system_admin）', () => {
    renderWithProvider(<FooterShortcutBar role="system_admin" />, 'en');
    expect(screen.getByTestId('footer-shortcut-bar-item-settings')).toBeInTheDocument();
    expect(screen.getByTestId('footer-shortcut-bar-item-tenants')).toBeInTheDocument();
    expect(screen.getByTestId('footer-shortcut-bar-item-logs')).toBeInTheDocument();
  });

  it('T-C05-01: 権限別表示（tenant_admin）', () => {
    renderWithProvider(<FooterShortcutBar role="tenant_admin" />, 'en');
    expect(screen.getByTestId('footer-shortcut-bar-item-board')).toBeInTheDocument();
    expect(screen.getByTestId('footer-shortcut-bar-item-booking')).toBeInTheDocument();
    expect(screen.getByTestId('footer-shortcut-bar-item-settings')).toBeInTheDocument();
  });

  it('T-C05-01: 権限別表示（general_user）', () => {
    renderWithProvider(<FooterShortcutBar role="general_user" />, 'en');
    expect(screen.getByTestId('footer-shortcut-bar-item-board')).toBeInTheDocument();
    expect(screen.getByTestId('footer-shortcut-bar-item-survey')).toBeInTheDocument();
    expect(screen.getByTestId('footer-shortcut-bar-item-mypage')).toBeInTheDocument();
  });

  it('T-C05-02: 翻訳表示（en）', async () => {
    renderWithProvider(<FooterShortcutBar role="system_admin" />, 'en');
    expect(await screen.findByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Tenants')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
  });

  it('T-C05-03: アクティブ判定（/board で board が active）', () => {
    mockPathname.mockReturnValue('/board/topics');
    renderWithProvider(<FooterShortcutBar role="general_user" />, 'en');
    const el = screen.getByTestId('footer-shortcut-bar-item-board');
    expect(el).toHaveClass('text-blue-600');
    expect(el).toHaveClass('border-t-2');
    expect(el).toHaveClass('border-blue-600');
  });

  it('T-C05-04: ARIA nav/aria-label', () => {
    renderWithProvider(<FooterShortcutBar role="general_user" />);
    const nav = screen.getByRole('navigation', { name: 'ショートカットバー' });
    expect(nav).toBeInTheDocument();
  });

  it('T-C05-05: className/testId 反映', () => {
    renderWithProvider(<FooterShortcutBar role="general_user" className="bg-red-100 foo" testId="bar" />);
    const nav = screen.getByTestId('bar');
    expect(nav).toHaveClass('foo');
    expect(nav).toHaveClass('fixed');
    expect(nav).toHaveClass('bottom-0');
    expect(nav).toHaveClass('bg-white');
    expect(nav).toHaveClass('border-t');
    expect(nav).toHaveClass('border-gray-200');
    expect(nav).toHaveClass('z-[950]');
  });
});
