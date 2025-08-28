export default function Forbidden() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold mb-2">Forbidden</h1>
        <p className="text-slate-600">
          You don’t have permission to access this page. If you believe this is an error,
          please contact an administrator.
        </p>
        <a href="/" className="inline-block mt-6 rounded bg-black text-white px-4 py-2">Go home</a>
      </div>
    </main>
  );
}
