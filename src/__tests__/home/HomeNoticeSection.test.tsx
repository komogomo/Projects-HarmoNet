import React from 'react';
import { render, screen } from '@testing-library/react';
import { HomeNoticeSection } from '@/src/components/home/HomeNoticeSection/HomeNoticeSection';
import type { HomeNoticeItem } from '@/src/components/home/HomeNoticeSection/HomeNoticeSection.types';
import { DEFAULT_HOME_NOTICE_COUNT, HOME_NOTICE_MAX_COUNT, clampNoticeCount } from '@/src/components/home/HomeNoticeSection/HomeNoticeSection.types';
import { StaticI18nProvider } from '@/src/components/common/StaticI18nProvider';

function renderWithProvider(ui: React.ReactElement) {
  (globalThis as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      home: {
        noticeSection: {
          title: '最新のお知らせ',
          emptyMessage: '現在表示するお知らせはありません。',
        },
      },
    }),
  });

  return render(<StaticI18nProvider>{ui}</StaticI18nProvider>);
}

const BASE_ITEMS: HomeNoticeItem[] = [
  { id: '1', title: 'お知らせ1', publishedAt: '2025/11/20', content: '本文1' },
  { id: '2', title: 'お知らせ2', publishedAt: '2025/11/19', content: '本文2' },
  { id: '3', title: 'お知らせ3', publishedAt: '2025/11/18', content: '本文3' },
];

describe('HomeNoticeSection', () => {
  test('items が 0 件のとき、タイトルと空メッセージのみ表示されカードは 0 件', () => {
    renderWithProvider(<HomeNoticeSection items={[]} maxItems={2} />);

    expect(screen.getByText('最新のお知らせ')).toBeInTheDocument();
    expect(screen.getByText('現在表示するお知らせはありません。')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  test('items が 1 件のとき、カードは 1 件だけ表示される', () => {
    renderWithProvider(<HomeNoticeSection items={BASE_ITEMS.slice(0, 1)} maxItems={2} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  test('items が 3 件、maxItems=2 のとき、カードは 2 件だけ表示される', () => {
    renderWithProvider(<HomeNoticeSection items={BASE_ITEMS} maxItems={2} />);

    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  test('maxItems 未指定のとき、DEFAULT_HOME_NOTICE_COUNT 件まで表示される', () => {
    renderWithProvider(<HomeNoticeSection items={BASE_ITEMS} />);

    expect(screen.getAllByRole('button')).toHaveLength(DEFAULT_HOME_NOTICE_COUNT);
  });
});

describe('clampNoticeCount', () => {
  test('未指定・範囲外の値は 1〜3 件に clamp される', () => {
    expect(clampNoticeCount(undefined)).toBe(DEFAULT_HOME_NOTICE_COUNT);
    expect(clampNoticeCount(0)).toBe(1);
    expect(clampNoticeCount(1)).toBe(1);
    expect(clampNoticeCount(2)).toBe(2);
    expect(clampNoticeCount(3)).toBe(HOME_NOTICE_MAX_COUNT);
    expect(clampNoticeCount(4)).toBe(HOME_NOTICE_MAX_COUNT);
  });
});
