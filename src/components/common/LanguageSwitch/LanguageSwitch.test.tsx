import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageSwitch } from './LanguageSwitch';
import { StaticI18nProvider } from '@/src/components/common/StaticI18nProvider';

describe('LanguageSwitch (3-button)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selectedLanguage', 'ja');
    }
  });

  test('初期表示と各ボタンでの切替', async () => {
    const user = userEvent.setup();
    render(
      <StaticI18nProvider>
        <LanguageSwitch />
      </StaticI18nProvider>
    );

    const jaBtn = screen.getByRole('button', { name: /JAに切り替え/i });
    const enBtn = screen.getByRole('button', { name: /ENに切り替え/i });
    const zhBtn = screen.getByRole('button', { name: /中文に切り替え/i });

    expect(jaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(enBtn).toHaveAttribute('aria-pressed', 'false');
    expect(zhBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(enBtn);
    expect(enBtn).toHaveAttribute('aria-pressed', 'true');
    expect(jaBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(zhBtn);
    expect(zhBtn).toHaveAttribute('aria-pressed', 'true');
    expect(enBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(jaBtn);
    expect(jaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(zhBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
