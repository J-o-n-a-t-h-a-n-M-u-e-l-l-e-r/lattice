import Link from 'next/link';
import { api, type RepoRow } from '../lib/api';
import { RepoForm } from '../components/RepoForm';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let repos: RepoRow[] = [];
  let offline = false;
  try { repos = await api.repos(); } catch { offline = true; }

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-[28px] font-semibold tracking-tight leading-tight">
        The dependency graph hidden in your backlog
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed" style={{ color: '#8b93a7' }}>
        Paste a public GitHub repository. Lattice reads its issues, works out what
        actually blocks what, and shows you the order — plus what is safe to start
        right now, in parallel.
      </p>

      <div className="mt-8"><RepoForm /></div>

      {offline && (
        <p className="mt-4 text-[12px]" style={{ color: '#f0883e' }}>
          The backend is not reachable. Start it with{' '}
          <code className="font-mono">npm start -w @lattice/backend</code>.
        </p>
      )}

      {repos.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[11px] uppercase tracking-[0.14em] mb-3" style={{ color: '#8b93a7' }}>
            Already analysed
          </h2>
          <ul className="space-y-1.5">
            {repos.map((r) => (
              <li key={r.repo}>
                <Link href={`/r/${r.repo}`}
                      className="flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors hover:border-white/30"
                      style={{ borderColor: '#2a3140', background: '#141821' }}>
                  <span className="text-[13px] font-medium">{r.repo}</span>
                  <span className="text-[11px] font-mono ml-auto" style={{ color: '#8b93a7' }}>
                    {r.issues} open
                  </span>
                  {r.updatedAt && (
                    <span className="text-[11px]" style={{ color: '#5a6274' }}>
                      {new Date(r.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-14 text-[11.5px] leading-relaxed" style={{ color: '#5a6274' }}>
        Lattice only reads. It never writes to your repository — no dependencies,
        no comments, no labels.
      </p>
    </main>
  );
}
