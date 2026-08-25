import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lattice',
  description: 'The dependency graph hidden in your backlog.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <header className="flex items-center gap-6 border-b px-5 h-14"
                style={{ borderColor: 'var(--line)' }}>
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M9 1.5 16 5.5v7L9 16.5 2 12.5v-7L9 1.5Z" stroke="var(--accent)" strokeWidth="1.4" />
              <path d="M9 1.5v15M2 5.5l14 7M16 5.5l-14 7" stroke="var(--accent)" strokeWidth="1.1" opacity=".45" />
            </svg>
            Lattice
          </Link>
          <nav className="flex items-center gap-4 text-sm" style={{ color: 'var(--muted)' }}>
            <Link href="/" className="hover:text-white transition-colors">Graph</Link>
            <Link href="/runs" className="hover:text-white transition-colors">Runs</Link>
            <Link href="/pitch" className="hover:text-white transition-colors">Pitch</Link>
          </nav>
          <span className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>
            GitHub is a data source, not a data store
          </span>
        </header>
        {children}
      </body>
    </html>
  );
}
