export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header skeleton */}
      <div className="h-6 w-48 skeleton rounded-lg mb-2" />
      <div className="h-4 w-32 skeleton rounded-lg mb-8" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex flex-col" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="aspect-square skeleton rounded-t-2xl" />
            <div className="p-4 space-y-2 bg-white rounded-b-2xl border border-t-0 border-slate-100">
              <div className="h-3 w-16 skeleton" />
              <div className="h-4 skeleton" />
              <div className="h-4 w-3/4 skeleton" />
              <div className="h-6 w-24 skeleton mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
