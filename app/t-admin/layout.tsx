import React from 'react';
import { HomeFooterShortcuts } from '@/src/components/common/HomeFooterShortcuts/HomeFooterShortcuts';
import { TenantAdminSidebar } from '@/src/components/t-admin/TenantAdminSidebar/TenantAdminSidebar';

export default function TenantAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-gray-50 pt-28">
            {/* Left Sidebar */}
            <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-gray-200 bg-white overflow-y-auto hidden md:block z-30">
                <TenantAdminSidebar />
            </aside>

            {/* Main Content */}
            <div className="flex-1 pb-24">
                {children}
            </div>
            <HomeFooterShortcuts />
        </div>
    );
}
