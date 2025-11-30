'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

interface TenantNameDisplayProps {
    tenantName: string;
}

export const TenantNameDisplay: React.FC<TenantNameDisplayProps> = ({ tenantName }) => {
    const pathname = usePathname();

    // ログイン画面では表示しない
    if (pathname?.startsWith('/login')) {
        return null;
    }

    if (!tenantName) return null;

    return (
        <div className="mt-[60px] w-full max-w-5xl mx-auto px-4 py-2 flex justify-center items-center bg-white">
            <h2 className="text-lg font-bold text-gray-700">
                {tenantName}
            </h2>
        </div>
    );
};
