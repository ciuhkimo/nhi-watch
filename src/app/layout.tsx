import type { Metadata } from "next";
import localFont from "next/font/local";
import Sidebar from "@/components/layout/Sidebar";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "NHI-Watch 健保給付查詢系統",
  description: "恆春旅遊醫院健保給付查詢儀表板",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Sidebar />
        <main className="lg:pl-60">
          <div className="mx-auto max-w-screen-xl px-4 py-6 pt-16 sm:px-6 lg:pt-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
