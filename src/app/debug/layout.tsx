'use client';
export const prerender = false;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DebugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
