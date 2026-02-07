import type { Metadata } from "next";
import { Crimson_Pro, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "All of Math",
  description:
    "An attempt to compile all existing solved math problems in history.",
  openGraph: {
    title: "All of Math",
    description: "An attempt to compile all existing solved math problems in history.",
    url: "https://allofmath.org",
    siteName: "All of Math",
    type: "website",
  },
};

function Header() {
  return (
    <header className="w-full absolute top-0 left-0 z-50">
      <nav
        className="mx-auto flex items-center justify-between px-6 py-4"
        style={{ maxWidth: "var(--page-max)" }}
      >
        <Link href="/" className="no-underline text-xl tracking-tight flex items-center gap-2">
          <span className="text-2xl">π</span>
          <span>
            <span className="font-semibold">All</span>{" "}
            <span className="font-normal">of</span>{" "}
            <span className="font-semibold">Math</span>
          </span>
        </Link>
        <div className="flex items-center gap-6 text-base">
          <Link href="/search">Search</Link>
          <Link href="/learn">Learn</Link>
          <Link href="/waitlist?feature=api">API</Link>
          <Link href="/me">Account</Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-foreground/10 mt-auto">
      <div className="mx-auto flex items-center justify-between px-4 py-3 text-[11px] opacity-50" style={{ maxWidth: "var(--page-max)" }}>
        <span>A Nana Asante Production.</span>
        <span>Open source under MIT license.</span>
        <a
          href="mailto:nasante1@swarthmore.edu?subject=allofmath%20bug"
          className="underline underline-offset-4 hover:opacity-100"
        >
          Report a bug
        </a>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${crimsonPro.variable} ${geistMono.variable} min-h-screen flex flex-col`}>
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
