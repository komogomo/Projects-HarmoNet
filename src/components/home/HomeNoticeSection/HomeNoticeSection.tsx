"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Newspaper } from 'lucide-react';
import { useI18n } from '@/src/components/common/StaticI18nProvider';
import type { HomeNoticeSectionProps } from './HomeNoticeSection.types';
import { clampNoticeCount, DEFAULT_HOME_NOTICE_COUNT } from './HomeNoticeSection.types';

export const HomeNoticeSection: React.FC<HomeNoticeSectionProps> = ({ items, maxItems, tenantName }) => {
  const { t } = useI18n();
  const router = useRouter();

  const hasItems = items && items.length > 0;

  if (!hasItems) {
    return (
      <section aria-labelledby="home-notice-title">
        {tenantName && (
          <div className="mb-1 flex justify-center">
            <p className="max-w-full truncate text-base font-medium text-gray-600">
              {tenantName}
            </p>
          </div>
        )}
        <h2 id="home-notice-title" className="mb-2 text-base font-semibold text-gray-900 flex items-center gap-2">
          <Newspaper aria-hidden="true" className="h-5 w-5 text-blue-600" />
          <span>{t('home.noticeSection.title')}</span>
        </h2>
        <p className="text-sm text-gray-500">{t('home.noticeSection.emptyMessage')}</p>
      </section>
    );
  }

  const limit = clampNoticeCount(maxItems ?? DEFAULT_HOME_NOTICE_COUNT);
  const visibleItems = items.slice(0, limit);

  return (
    <section aria-labelledby="home-notice-title">
      {tenantName && (
        <div className="mb-1 flex justify-center">
          <p className="max-w-full truncate text-base font-medium text-gray-600">
            {tenantName}
          </p>
        </div>
      )}
      <h2 id="home-notice-title" className="mb-3 text-base font-semibold text-gray-900 flex items-center gap-2">
        <Newspaper aria-hidden="true" className="h-5 w-5 text-blue-600" />
        <span>{t('home.noticeSection.title')}</span>
      </h2>
      <div className="space-y-3">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className="w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label={`${item.publishedAt} ${item.title}`}
            onClick={() => {
              router.push(`/board/${item.id}`);
            }}
          >
            <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
              <span className="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                {t('home.noticeSection.badge')}
              </span>
              <span>{item.publishedAt}</span>
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</p>
                {item.content && (
                  <p className="text-xs text-gray-600 line-clamp-2">{item.content}</p>
                )}
              </div>
              <span className="ml-1 text-gray-400" aria-hidden="true">
                &gt;
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

HomeNoticeSection.displayName = 'HomeNoticeSection';
