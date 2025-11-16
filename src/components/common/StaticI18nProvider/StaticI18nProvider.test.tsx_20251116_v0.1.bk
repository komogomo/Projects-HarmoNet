import { render, screen, act, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import { StaticI18nProvider, useStaticI18n } from './index';

function Consumer() {
  const { t, currentLocale, setLocale } = useStaticI18n();
  useEffect(() => {
    // expose setter for tests via data attribute
    (window as any).__setLocale = setLocale;
  }, [setLocale]);
  return (
    <div>
      <span data-testid="locale">{currentLocale}</span>
      <span data-testid="label-language">{t('common.language')}</span>
    </div>
  );
}

describe('StaticI18nProvider', () => {
  const originalFetch = global.fetch;
  const originalWarn = console.warn;
  let setItemSpy: jest.SpyInstance | undefined;

  beforeEach(() => {
    console.warn = jest.fn();
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/locales/ja/common.json')) {
        return { ok: true, json: async () => ({ common: { language: '言語', save: '保存', cancel: 'キャンセル' } }) } as any;
      }
      if (url.endsWith('/locales/en/common.json')) {
        return { ok: true, json: async () => ({ common: { language: 'Language', save: 'Save', cancel: 'Cancel' } }) } as any;
      }
      if (url.endsWith('/locales/zh/common.json')) {
        return { ok: true, json: async () => ({ common: { language: '语言', save: '保存', cancel: '取消' } }) } as any;
      }
      return { ok: false, json: async () => ({}) } as any;
    }) as any;
    setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    global.fetch = originalFetch as any;
    console.warn = originalWarn;
    setItemSpy?.mockRestore();
  });

  it('初期ロケール読込（ja）', async () => {
    render(
      <StaticI18nProvider initialLocale="ja">
        <Consumer />
      </StaticI18nProvider>
    );
    await act(async () => {});
    await new Promise((r) => setTimeout(r, 0));
    expect(await screen.findByTestId('label-language')).toHaveTextContent('言語');
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('ja'));
  });

  it('setLocale で辞書差し替え（ja -> en）', async () => {
    render(
      <StaticI18nProvider initialLocale="ja">
        <Consumer />
      </StaticI18nProvider>
    );
    await act(async () => {
      (window as any).__setLocale('en');
    });
    expect(await screen.findByTestId('locale')).toHaveTextContent('en');
    expect(await screen.findByTestId('label-language')).toHaveTextContent('Language');
  });

  it('未定義キーは警告＋キーをそのまま返す', async () => {
    render(
      <StaticI18nProvider initialLocale="ja">
        <div>
          <InnerMissing />
        </div>
      </StaticI18nProvider>
    );
    expect(console.warn).toHaveBeenCalled();
    expect(await screen.findByTestId('missing')).toHaveTextContent('unknown.key');
  });

  function InnerMissing() {
    const { t } = useStaticI18n();
    return <span data-testid="missing">{t('unknown.key')}</span>;
  }

  it('フォールバック: zh の取得失敗時 ja にフォールバック', async () => {
    // override fetch: zh だけ失敗
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/locales/ja/common.json')) {
        return { ok: true, json: async () => ({ common: { language: '言語' } }) } as any;
      }
      if (url.endsWith('/locales/zh/common.json')) {
        return { ok: false, json: async () => ({}) } as any;
      }
      return { ok: false, json: async () => ({}) } as any;
    }) as any;

    render(
      <StaticI18nProvider initialLocale="zh">
        <Consumer />
      </StaticI18nProvider>
    );

    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('ja'));
    expect(await screen.findByTestId('label-language')).toHaveTextContent('言語');
  });

  it('localStorage 更新（enablePersistence デフォルト true）', async () => {
    render(
      <StaticI18nProvider initialLocale="ja">
        <Consumer />
      </StaticI18nProvider>
    );
    await act(async () => {
      (window as any).__setLocale('en');
    });
    expect(setItemSpy).toHaveBeenCalledWith('locale', 'en');
  });

  it('Provider 外使用時は例外', () => {
    const Broken = () => {
      useStaticI18n();
      return null;
    };
    expect(() => render(<Broken />)).toThrowError();
  });
});
