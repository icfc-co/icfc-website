import './globals.css'
import Layout from '@/components/Layout'
import type { Metadata } from 'next';

// If you had a font or className on <body>, keep it:
import AuthCookieSync from '@/components/AuthCookieSync'; // client component we add

export const metadata = {
  title: 'ICFC Masjid',
  description: 'Islamic Center of Fort Collins – Official Website',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
      <AuthCookieSync />
        <Layout>{children}</Layout>
      </body>
    </html>
  )
}
