'use client';

import { Auth0Provider } from '@auth0/auth0-react';
import { ReactNode } from 'react';
import { addLocalePrefix, getLocaleFromPathname } from '@/lib/utils/locale';

interface Auth0ProviderWithConfigProps {
  children: ReactNode;
}

export default function Auth0ProviderWithConfig({ children }: Auth0ProviderWithConfigProps) {
  // Auth0設定値（環境変数から取得、フォールバックとしてハードコードされた値を使用）
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-2mqgvitlgxdwl5ea.us.auth0.com';
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'YGlRudHFYDfkcMZSgamI9PIrhPsFsLmD';
  const redirectUri =
    process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI ||
    'https://disease-community-frontend-508246122017.asia-northeast1.run.app/callback';
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.disease-community.com';

  // 設定値が不足している場合はAuth0を無効化
  if (!domain || !clientId || !redirectUri) {
    // Only warn in development or verbose mode
    if (process.env.NODE_ENV === 'development' || 
        (typeof window !== 'undefined' && localStorage.getItem('debugAuth0') === 'true')) {
      console.warn('Auth0 configuration missing. Authentication will be disabled.');
    }
    return <>{children}</>;
  }

  try {
    return (
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: redirectUri,
          audience: audience,
          scope: 'openid profile email',
        }}
        useRefreshTokens={true}
        cacheLocation="localstorage"
        skipRedirectCallback={false}
        onRedirectCallback={appState => {
          // Only log in verbose mode
          if (typeof window !== 'undefined' && localStorage.getItem('debugAuth0') === 'true') {
            console.log('Auth0 redirect callback:', appState);
          }
          // Handle redirect after login - add locale prefix to URL
          let redirectUrl = '/';
          if (appState?.returnTo) {
            // addLocalePrefix will handle existing locale prefix
            redirectUrl = addLocalePrefix(appState.returnTo);
          } else {
            redirectUrl = addLocalePrefix('/');
          }
          window.location.href = redirectUrl;
        }}
      >
        {children}
      </Auth0Provider>
    );
  } catch (error) {
    console.error('Auth0Provider initialization error:', error);
    return <>{children}</>;
  }
}
