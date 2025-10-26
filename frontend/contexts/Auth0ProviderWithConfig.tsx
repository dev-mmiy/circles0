'use client';

import { Auth0Provider } from '@auth0/auth0-react';
import { ReactNode } from 'react';

interface Auth0ProviderWithConfigProps {
  children: ReactNode;
}

export default function Auth0ProviderWithConfig({ children }: Auth0ProviderWithConfigProps) {
  // Auth0設定値（環境変数から取得）
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI;
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;

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
        useRefreshTokens={true}
        cacheLocation="localstorage"
        onRedirectCallback={(appState) => {
          // Handle redirect after login
          window.location.replace(appState?.returnTo || '/');
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