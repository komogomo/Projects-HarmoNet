import React, { Suspense } from 'react';
import AuthCallbackHandler from '@/src/components/login/AuthCallbackHandler/AuthCallbackHandler';
import { AuthLoadingIndicator } from '@/src/components/common/AuthLoadingIndicator/AuthLoadingIndicator';

export default function AuthCallbackPage() {
  return (
    <div className="mx-auto w-full max-w-md p-6">
      <Suspense fallback={<AuthLoadingIndicator label="Processing..." />}> 
        <AuthCallbackHandler />
      </Suspense>
    </div>
  );
}
