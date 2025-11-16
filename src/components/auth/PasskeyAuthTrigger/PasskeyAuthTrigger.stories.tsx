import React from 'react';
import { PasskeyAuthTrigger } from './PasskeyAuthTrigger';
import { StaticI18nProvider, useStaticI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';

type Locale = 'ja' | 'en' | 'zh';

const Button: React.FC<{
  code: Locale;
  label: string;
  currentLocale: Locale;
  setLocale: (l: Locale) => void;
}> = ({ code, label, currentLocale, setLocale }) => (
  <button
    type="button"
    onClick={() => setLocale(code)}
    disabled={currentLocale === code}
    style={{
      padding: '4px 10px',
      borderRadius: 6,
      border: '1px solid #e5e7eb',
      background: currentLocale === code ? '#111827' : '#ffffff',
      color: currentLocale === code ? '#ffffff' : '#111827',
      cursor: currentLocale === code ? 'default' : 'pointer',
    }}
  >
    {label}
  </button>
);

function LocaleSwitcher() {
  const { currentLocale, setLocale } = useStaticI18n();
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
      <Button code="ja" label="JA" currentLocale={currentLocale} setLocale={setLocale} />
      <Button code="en" label="EN" currentLocale={currentLocale} setLocale={setLocale} />
      <Button code="zh" label="ZH" currentLocale={currentLocale} setLocale={setLocale} />
    </div>
  );
}

const meta = {
  title: 'Auth/PasskeyAuthTrigger',
  component: PasskeyAuthTrigger,
  decorators: [
    (Story: any) => (
      <StaticI18nProvider>
        <div className="p-4">
          <LocaleSwitcher />
          <Story />
        </div>
      </StaticI18nProvider>
    ),
  ],
};

export default meta;

export const Idle = {
  render: () => <PasskeyAuthTrigger />,
};
