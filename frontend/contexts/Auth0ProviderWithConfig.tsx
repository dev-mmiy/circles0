'use client';

import { Auth0Provider } from '@auth0/auth0-react';
import { ReactNode } from 'react';

interface Auth0ProviderWithConfigProps {
  children: ReactNode;
}

export default function Auth0ProviderWithConfig({ children }: Auth0ProviderWithConfigProps) {
  // Auth0設定値（環境変数から取得、フォールバックとしてハードコードされた値を使用）
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-2mqgvitlgxdwl5ea.us.auth0.com';
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'YGlRudHFYDfkcMZSgamI9PIrhPsFsLmD';
  const redirectUri = process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || 'https://disease-community-frontend-508246122017.asia-northeast1.run.app/callback';
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://api.disease-community.com';

  console.log('Auth0 Environment Variables:', {
    domain: domain ? 'SET' : 'MISSING',
    clientId: clientId ? 'SET' : 'MISSING',
    redirectUri: redirectUri ? 'SET' : 'MISSING',
    audience: audience ? 'SET' : 'MISSING',
  });

  // 設定値が不足している場合はAuth0を無効化
  if (!domain || !clientId || !redirectUri) {
    console.warn('Auth0 configuration missing. Authentication will be disabled.');
    console.warn('Missing values:', { domain: !!domain, clientId: !!clientId, redirectUri: !!redirectUri });
    return <>{children}</>;
  }

  console.log('Auth0 Configuration:', {
    domain,
    clientId,
    redirectUri,
    audience,
  });

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
        useRefreshTokens={false}
        cacheLocation="memory"
        skipRedirectCallback={false}
        onRedirectCallback={(appState) => {
          console.log('Auth0 redirect callback:', appState);
          // Handle redirect after login - use push instead of replace to avoid state issues
          window.location.href = appState?.returnTo || '/';
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