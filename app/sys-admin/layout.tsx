import React from 'react';

export default function SysAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-24">
      <div className="mx-auto w-full max-w-5xl px-4">
        {children}
      </div>
    </div>
  );
}
