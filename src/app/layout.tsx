import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "iPet — Smart Pet Pass",
  description: "Compliance as a Service para embarque aéreo de pets",
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-emerald-700">
              🐾 iPet
            </Link>
            <Link href="/pets" className="text-sm font-medium text-slate-600 hover:text-emerald-700">
              Pets
            </Link>
            <Link href="/checkin" className="text-sm font-medium text-slate-600 hover:text-emerald-700">
              Check-in
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
