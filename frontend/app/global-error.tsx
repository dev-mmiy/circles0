'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{
              maxWidth: '400px',
              width: '100%',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <h1
              style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}
            >
              Application Error
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              {error.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={reset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

