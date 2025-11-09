import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSwitch } from './LanguageSwitch';

const replaceMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/login',
}));

jest.mock('lucide-react', () => ({
  ChevronDown: (props: any) => <span {...props} />,
  Check: (props: any) => <span {...props} />,
}));

describe('LanguageSwitch', () => {
  beforeEach(() => {
    replaceMock.mockClear();
  });

  it('現在ロケールが表示される (T-C02-01)', () => {
    render(<LanguageSwitch currentLocale="ja" />);
    expect(screen.getByTestId('language-switch-current')).toHaveTextContent('ja');
  });

  it('メニューが展開される (T-C02-02)', () => {
    render(<LanguageSwitch currentLocale="ja" />);
    fireEvent.click(screen.getByTestId('language-switch'));
    expect(screen.getByTestId('language-switch-menu')).toBeInTheDocument();
  });

  it('言語選択時に router.replace が呼ばれる (T-C02-03)', () => {
    render(<LanguageSwitch currentLocale="ja" />);
    fireEvent.click(screen.getByTestId('language-switch'));
    fireEvent.click(screen.getByTestId('language-switch-option-en'));
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('onLanguageChange コールバックが発火する (T-C02-04)', () => {
    const cb = jest.fn();
    render(<LanguageSwitch currentLocale="ja" onLanguageChange={cb} />);
    fireEvent.click(screen.getByTestId('language-switch'));
    fireEvent.click(screen.getByTestId('language-switch-option-en'));
    expect(cb).toHaveBeenCalledWith('en');
  });

  it('現在ロケールにチェックマークが表示される (T-C02-05)', () => {
    render(<LanguageSwitch currentLocale="ja" />);
    fireEvent.click(screen.getByTestId('language-switch'));
    expect(screen.getByTestId('language-switch-check-ja')).toBeInTheDocument();
  });

  it('キーボード操作でメニューを開ける (T-C02-06)', () => {
    render(<LanguageSwitch currentLocale="ja" />);
    const trigger = screen.getByTestId('language-switch');
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByTestId('language-switch-menu')).toBeInTheDocument();
  });

  it('aria 属性が設定されている (T-C02-07)', () => {
    render(<LanguageSwitch currentLocale="ja" />);
    fireEvent.click(screen.getByTestId('language-switch'));
    const item = screen.getByTestId('language-switch-option-ja');
    expect(item).toHaveAttribute('role', 'menuitemradio');
    expect(item).toHaveAttribute('aria-checked', 'true');
  });
});
