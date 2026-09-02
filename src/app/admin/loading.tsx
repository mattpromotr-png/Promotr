export default function AdminLoading() {
  return (
    <main className="min-h-svh px-4 py-8 sm:px-6 lg:px-8" aria-busy="true">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="bg-elevated h-4 w-32 rounded" />
        <div className="bg-elevated mt-4 h-10 w-72 max-w-full rounded-xl" />
        <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="border-border bg-surface h-40 rounded-3xl border"
            />
          ))}
        </div>
        <div className="border-border bg-surface mt-6 h-96 rounded-3xl border" />
      </div>
      <span className="sr-only">Loading admin data</span>
    </main>
  );
}
