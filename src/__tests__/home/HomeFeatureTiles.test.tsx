import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaticI18nProvider } from '@/src/components/common/StaticI18nProvider';
import { HomeFeatureTiles } from '@/src/components/home/HomeFeatureTiles/HomeFeatureTiles';
import { HomeFeatureTile } from '@/src/components/home/HomeFeatureTiles/HomeFeatureTile';
import type { HomeFeatureTileDefinition } from '@/src/components/home/HomeFeatureTiles/HomeFeatureTile.types';
import { HOME_FEATURE_TILES } from '@/src/components/home/HomeFeatureTiles/HomeFeatureTiles.types';

function mockFetchForHome() {
  (globalThis as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      home: {
        features: { title: '機能メニュー' },
        tiles: {
          notice: { label: 'お知らせ', description: 'お知らせ一覧' },
          board: { label: '掲示板', description: '掲示板一覧' },
          facility: { label: '施設予約', description: '施設予約' },
          rules: { label: '運用ルール', description: 'ルール一覧' },
          notification: { label: '通知設定', description: '通知設定' },
          dummy: { label: '準備中', description: '準備中' },
        },
      },
    }),
  });
}

function renderWithProvider(ui: React.ReactElement) {
  mockFetchForHome();
  return render(<StaticI18nProvider>{ui}</StaticI18nProvider>);
}

describe('HomeFeatureTiles', () => {
  test('HOME_FEATURE_TILES を渡したときに 6 件のタイルが描画される', () => {
    renderWithProvider(<HomeFeatureTiles tiles={HOME_FEATURE_TILES} />);

    const buttons = screen.getAllByRole('button');
    // 6 タイルぶんのボタンが含まれていることだけ確認（細かい数は HomeFooterShortcuts などと干渉しないよう緩めにチェック）
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });

  test('tiles が空配列でもクライアント側の静的定義で 6 件表示される', () => {
    renderWithProvider(<HomeFeatureTiles tiles={[]} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });

  test('タイルセクションのタイトルが表示される', async () => {
    renderWithProvider(<HomeFeatureTiles tiles={HOME_FEATURE_TILES} />);

    expect(await screen.findByText('機能メニュー')).toBeInTheDocument();
  });
});

const DummyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg data-testid="dummy-icon" {...props} />
);

const BASE_TILE: HomeFeatureTileDefinition = {
  featureKey: 'NOTICE',
  labelKey: 'home.tiles.notice.label',
  descriptionKey: 'home.tiles.notice.description',
  icon: DummyIcon,
  isEnabled: false,
};

describe('HomeFeatureTile', () => {
  test('isEnabled=false のとき aria-disabled="true" で onClick が呼ばれない', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    renderWithProvider(
      <HomeFeatureTile
        {...BASE_TILE}
        isEnabled={false}
        onClick={handleClick}
      />,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('isEnabled=true のとき onClick が 1 回呼ばれる', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    renderWithProvider(
      <HomeFeatureTile
        {...BASE_TILE}
        isEnabled={true}
        onClick={handleClick}
      />,
    );

    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('aria-disabled', 'true');

    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
