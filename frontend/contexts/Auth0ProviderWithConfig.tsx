'use client';

import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { useRouter } from 'next/navigation';

type Props = { children: React.ReactNode };

function InnerAuth0Provider({ children }: Props) {
  const router = useRouter();

  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '';
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '';
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || undefined;
  const callbackUrl =
    process.env.NEXT_PUBLIC_AUTH0_CALLBACK_URL ||
    (typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : '');

  const onRedirectCallback = (appState?: { returnTo?: string }) => {
    router.push(appState?.returnTo || '/');
  };

  // If Auth0 is not configured, render children without provider (no-op)
  if (!domain || !clientId) {
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: callbackUrl,
        audience,
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      {children}
    </Auth0Provider>
  );
}

export default function Auth0ProviderWithConfig({ children }: Props) {
  return <InnerAuth0Provider>{children}</InnerAuth0Provider>;
}
