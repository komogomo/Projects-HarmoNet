import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState } from 'react';
import type { LanguageSwitchProps, Locale } from './LanguageSwitch.types';

const LOCALES: Locale[] = ['ja', 'en', 'zh'];

export const LanguageSwitch: React.FC<LanguageSwitchProps> = ({
  className = '',
  testId = 'language-switch',
  onLanguageChange,
  currentLocale = 'ja',
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;
    // Preserve current path while switching language (client-side navigation)
    router.replace(pathname);
    onLanguageChange?.(newLocale);
  };

  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Change language"
          className={`flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${className}`}
          data-testid={testId}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setOpen(true);
          }}
        >
          <span className="uppercase text-sm font-medium" data-testid={`${testId}-current`}>
            {currentLocale}
          </span>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          className="w-[140px] bg-white border border-gray-200 rounded-lg shadow-md p-1"
          data-testid={`${testId}-menu`}
        >
          {LOCALES.map((l) => {
            const isActive = l === currentLocale;
            return (
              <DropdownMenu.Item
                key={l}
                onSelect={(e: Event) => {
                  e.preventDefault();
                  handleLanguageChange(l);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer outline-none select-none ${
                  isActive ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-900 hover:bg-gray-50'
                }`}
                aria-checked={isActive}
                role="menuitemradio"
                data-testid={`${testId}-option-${l}`}
              >
                <span className="uppercase">{l}</span>
                {isActive && <Check className="h-4 w-4" aria-hidden="true" data-testid={`${testId}-check-${l}`} />}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

LanguageSwitch.displayName = 'LanguageSwitch';
