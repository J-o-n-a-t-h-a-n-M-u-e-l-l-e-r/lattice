import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '../components/Logo';
import { Providers } from '../components/Providers';
import { ThemeToggle } from '../components/ThemeToggle';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lattice — see what to build next',
  description: 'Lattice reads your GitHub issues, works out what blocks what, and shows you the order.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning >
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
            <Link href="/"
                  className="flex items-center gap-2 rounded-md font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Logo className="h-5 w-5 text-primary" />
              Lattice
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
