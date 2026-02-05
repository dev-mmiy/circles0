'use client';

import { useAuth0 } from '@auth0/auth0-react';

export default function LoginScreen() {
  const { loginWithRedirect } = useAuth0();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <h1 className="text-xl font-semibold mb-4">管理画面</h1>
        <p className="text-gray-600 mb-6">管理者としてログインしてください。</p>
        <button
          onClick={() => loginWithRedirect()}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          ログイン
        </button>
      </div>
    </div>
  );
}
