// /src/app/layout.tsx
import "./globals.css";
import Layout from "@/components/Layout";
import AuthCookieSync from "@/components/AuthCookieSync";
import { Noto_Naskh_Arabic } from "next/font/google";

export const metadata = {
  title: "ICFC Masjid",
  description: "Islamic Center of Fort Collins – Official Website",
};

// Load Arabic font once and expose as a CSS variable
const arabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-arabic",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={arabic.variable}>
      <body>
        <AuthCookieSync />
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
