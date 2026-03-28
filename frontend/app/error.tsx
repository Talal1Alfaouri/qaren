'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-6xl mb-6">⚡</div>
      <h2 className="text-2xl font-bold text-slate-900 mb-3">Something went wrong</h2>
      <p className="text-slate-500 text-sm mb-8 max-w-sm">
        حدث خطأ ما. يرجى المحاولة مرة أخرى.
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary">Try Again</button>
        <Link href="/" className="btn-secondary">Go Home</Link>
      </div>
    </div>
  );
}
