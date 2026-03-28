import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="text-7xl mb-6">🔍</div>
      <h1 className="text-3xl font-display font-bold text-slate-900 mb-3">
        Page Not Found
      </h1>
      <p className="text-slate-500 mb-2">
        الصفحة غير موجودة
      </p>
      <p className="text-slate-400 text-sm mb-8 max-w-sm">
        The page you're looking for doesn't exist or the product may no longer be available.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="btn-primary">
          Go Home
        </Link>
        <Link href="/search" className="btn-secondary">
          Browse Products
        </Link>
      </div>
    </div>
  );
}
