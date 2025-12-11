"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Layers, Home } from 'lucide-react';

export const TenantAdminSidebar: React.FC = () => {
  const pathname = usePathname();

  const isUsersActive = pathname.startsWith('/t-admin/users');
  const isGroupsActive = pathname.startsWith('/t-admin/groups');
  const isResidencesActive = pathname.startsWith('/t-admin/residences');

  const baseLinkClass = 'flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium';
  const activeClass = 'bg-blue-50 text-blue-700';
  const inactiveClass = 'text-gray-700 hover:bg-gray-50';

  return (
    <nav className="p-4 pt-14 space-y-2">
      <div className="mb-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        テナント管理
      </div>
      <Link
        href="/t-admin/users"
        className={`${baseLinkClass} ${isUsersActive ? activeClass : inactiveClass}`}
      >
        <Users size={20} />
        ユーザ管理
      </Link>
      <Link
        href="/t-admin/groups"
        className={`${baseLinkClass} ${isGroupsActive ? activeClass : inactiveClass}`}
      >
        <Layers size={20} />
        グループマスタ管理
      </Link>
      <Link
        href="/t-admin/residences"
        className={`${baseLinkClass} ${isResidencesActive ? activeClass : inactiveClass}`}
      >
        <Home size={20} />
        住居番号マスタ管理
      </Link>
    </nav>
  );
};
