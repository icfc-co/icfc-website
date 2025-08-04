// src/components/Layout.tsx
import Header from './Header'
import NavBar from './NavBar'
import Footer from './Footer'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <NavBar />
      <main className="flex-grow">{children}</main>
<Footer />
    </div>
  )
}
