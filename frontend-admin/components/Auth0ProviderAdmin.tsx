'use client';

import { Auth0Provider } from '@auth0/auth0-react';
import { ReactNode } from 'react';

export default function Auth0ProviderAdmin({ children }: { children: ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '';
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '';
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || '';

  const redirectUri =
    typeof window !== 'undefined' ? `${window.location.origin}/callback` : 'http://localhost:3002/callback';

  if (!domain || !clientId) {
    return (
      <div className="p-8 text-red-600">
        Auth0 not configured. Set NEXT_PUBLIC_AUTH0_DOMAIN and NEXT_PUBLIC_AUTH0_CLIENT_ID.
      </div>
    );
  }

  // cacheLocation: "memory" は PKCE の code_verifier がリダイレクトで消え /oauth/token が 400 になるため不可。
  // Auth0 は "memory" | "localstorage" のみ対応。localstorage でコールバック後のトークン交換を可能にしている。
  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience: audience || undefined,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
      onRedirectCallback={(appState) => {
        window.location.href = appState?.returnTo || '/';
      }}
    >
      {children}
    </Auth0Provider>
  );
}
