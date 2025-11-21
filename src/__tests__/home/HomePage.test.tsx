import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from '../../../app/home/page';
import type { HomeNoticeItem } from '@/src/components/home/HomeNoticeSection/HomeNoticeSection.types';
import { createSupabaseServerClient } from '@/src/lib/supabaseServerClient';

const HomeNoticeSectionMock = jest.fn();
const HomeFeatureTilesMock = jest.fn();
const HomeFooterShortcutsMock = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/src/lib/supabaseServerClient', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@/src/lib/logging/log.util', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

jest.mock('@/src/components/home/HomeNoticeSection/HomeNoticeSection', () => ({
  __esModule: true,
  HomeNoticeSection: (props: any) => {
    HomeNoticeSectionMock(props);
    return <div data-testid="home-notice-section" />;
  },
}));

jest.mock('@/src/components/home/HomeFeatureTiles/HomeFeatureTiles', () => ({
  __esModule: true,
  HomeFeatureTiles: (props: any) => {
    HomeFeatureTilesMock(props);
    return <div data-testid="home-feature-tiles" />;
  },
}));

jest.mock('@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts', () => ({
  __esModule: true,
  HomeFooterShortcuts: (props: any) => {
    HomeFooterShortcutsMock(props);
    return <div data-testid="home-footer-shortcuts" />;
  },
}));

function mockSupabaseSuccess() {
  const fromMock = jest.fn((table: string) => {
    const chain: any = {
      select: jest.fn(() => chain),
      eq: jest.fn(() => chain),
      maybeSingle: jest.fn(),
    };

    if (table === 'users') {
      chain.maybeSingle.mockResolvedValue({ data: { id: 'user-1' }, error: null });
    } else {
      chain.maybeSingle.mockResolvedValue({ data: { tenant_id: 'tenant-1' }, error: null });
    }

    return chain;
  });

  (createSupabaseServerClient as jest.Mock).mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: fromMock,
  });
}

beforeEach(() => {
  mockSupabaseSuccess();
  HomeNoticeSectionMock.mockClear();
  HomeFeatureTilesMock.mockClear();
  HomeFooterShortcutsMock.mockClear();
});

describe('HomePage', () => {
  test('認証成功時に HomeNoticeSection / HomeFeatureTiles / HomeFooterShortcuts が描画される', async () => {
    const ui = await HomePage();
    render(ui);

    expect(HomeNoticeSectionMock).toHaveBeenCalledTimes(1);
    expect(HomeFeatureTilesMock).toHaveBeenCalledTimes(1);
    expect(HomeFooterShortcutsMock).toHaveBeenCalledTimes(1);

    const noticeProps = (HomeNoticeSectionMock.mock.calls[0]?.[0] ?? { items: [] }) as {
      items: HomeNoticeItem[];
    };
    expect(Array.isArray(noticeProps.items)).toBe(true);
    expect(noticeProps.items).toHaveLength(2);

    expect(screen.getByTestId('home-notice-section')).toBeInTheDocument();
    expect(screen.getByTestId('home-feature-tiles')).toBeInTheDocument();
    expect(screen.getByTestId('home-footer-shortcuts')).toBeInTheDocument();
  });
});
