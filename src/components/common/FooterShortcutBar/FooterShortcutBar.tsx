'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Calendar, ClipboardList, User as UserIcon, Settings, Users, FileText } from 'lucide-react';
import type { FooterShortcutBarProps, UserRole } from './FooterShortcutBar.types';
import { useStaticI18n as useI18n } from '@/src/components/common/StaticI18nProvider/StaticI18nProvider';

type Item = { key: string; href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> };

const ROLE_ITEMS: Record<UserRole, Item[]> = {
  system_admin: [
    { key: 'settings', href: '/settings', icon: Settings },
    { key: 'tenants', href: '/tenants', icon: Users },
    { key: 'logs', href: '/logs', icon: FileText },
  ],
  tenant_admin: [
    { key: 'board', href: '/board', icon: MessageSquare },
    { key: 'booking', href: '/booking', icon: Calendar },
    { key: 'settings', href: '/settings', icon: Settings },
  ],
  general_user: [
    { key: 'board', href: '/board', icon: MessageSquare },
    { key: 'survey', href: '/survey', icon: ClipboardList },
    { key: 'mypage', href: '/mypage', icon: UserIcon },
  ],
};

export const FooterShortcutBar: React.FC<FooterShortcutBarProps> = ({ role, className = '', testId = 'footer-shortcut-bar' }) => {
  const pathname = usePathname();
  const { t } = useI18n();

  const items = useMemo(() => ROLE_ITEMS[role], [role]);

  return (
    <nav
      role="navigation"
      aria-label={t('common.shortcut_navigation')}
      data-testid={testId}
      className={`
        fixed bottom-0 left-0 right-0 h-16
        bg-white border-t border-gray-200 z-[950]
        flex items-center
        ${className}
      `}
    >
      <div className="flex w-full justify-between items-center px-3">
        {items.map(({ key, href, icon: Icon }) => {
          const active = pathname ? pathname.startsWith(href) : false;
          return (
            <Link
              href={href}
              key={key}
              aria-label={t(`shortcut.${key}`)}
              className={`
                flex flex-col items-center gap-1 text-xs
                ${active ? 'text-blue-600 border-t-2 border-blue-600' : 'text-gray-500'}
              `}
              data-testid={`${testId}-item-${key}`}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span>{t(`shortcut.${key}`)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

FooterShortcutBar.displayName = 'FooterShortcutBar';
