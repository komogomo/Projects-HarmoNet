import React from 'react';
import I18nRootProvider from './I18nRootProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <I18nRootProvider>{children}</I18nRootProvider>
      </body>
    </html>
  );
}
