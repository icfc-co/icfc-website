// src/app/debug/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const prerender = false;

export default function DebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
