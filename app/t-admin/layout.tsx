import React from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { HomeFooterShortcuts } from '@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts';

export default function TenantAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-gray-50 pt-16">
            {/* Left Sidebar */}
            <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-gray-200 bg-white overflow-y-auto hidden md:block">
                <nav className="p-4 space-y-2">
                    <div className="mb-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        テナント管理
                    </div>
                    <Link
                        href="/t-admin/users"
                        className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2 text-blue-700 font-medium"
                    >
                        <Users size={20} />
                        ユーザ管理
                    </Link>
                    {/* Future menu items can be added here */}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 pb-24">
                {children}
            </div>
            <HomeFooterShortcuts />
        </div>
    );
}
