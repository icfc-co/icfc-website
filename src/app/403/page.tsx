// src/app/403/page.tsx
export default function ForbiddenPage() {
  return (
    <main className="min-h-[60vh] grid place-items-center p-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">403 — Forbidden</h1>
        <p className="text-slate-600">
          You don’t have permission to access this page. If you believe this is an error,
          please contact an administrator.
        </p>
        <a href="/" className="inline-block mt-6 rounded bg-black text-white px-4 py-2">Go home</a>
      </div>
    </main>
  );
}
