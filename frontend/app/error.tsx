'use client';

/** clientModules や ppr など、Next.js の内部キャッシュずれで出る再読み込みで解消するエラーか */
function isStaleOrInternalPageError(error: Error | null): boolean {
  const m = error?.message ?? '';
  return m.includes('clientModules') || m.includes("'ppr')");
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const useStaleMessage = isStaleOrInternalPageError(error);
  const title = useStaleMessage ? 'ページの読み込みに失敗しました' : 'Application Error';
  const message = useStaleMessage
    ? 'しばらく時間が経ってから開いた場合に発生することがあります。次の手順を試してください：①「再試行」をクリック ② ページを再読み込み（F5）③ 改善しない場合はハードリロード（Windows: Ctrl+Shift+R / Mac: Cmd+Shift+R）④ それでも解決しない場合は、ブラウザのキャッシュを削除するか、時間をおいて再度アクセスしてください。'
    : (error?.message || 'An unexpected error occurred');

  return (
    <div
      style={{
        padding: '40px',
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>{title}</h1>
      <p style={{ color: '#666', marginBottom: '24px', maxWidth: '480px', lineHeight: 1.6 }}>
        {message}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '12px 24px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        再試行
      </button>
    </div>
  );
}
