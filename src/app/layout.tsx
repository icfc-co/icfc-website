import './globals.css'
import Layout from '@/components/Layout'

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
        <Layout>{children}</Layout>
      </body>
    </html>
  )
}
