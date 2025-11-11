"use client";

import React from 'react';

export const AuthLoadingIndicator: React.FC<{ label?: string }> = ({ label }) => {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-foreground">
      <svg className="h-4 w-4 animate-spin text-foreground" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      <span>{label ?? 'Processing...'}</span>
    </div>
  );
};

export default AuthLoadingIndicator;
