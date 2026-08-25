import Link from 'next/link';
import { ArrowRight, GitBranch, ListChecks, Workflow } from 'lucide-react';
import { api, type RepoRow } from '../lib/api';
import { RepoForm } from '../components/RepoForm';
import { MarkGithub } from '../components/Octicon';

export const dynamic = 'force-dynamic';

const VALUE = [
  { icon: ListChecks, title: 'Know what to start',
    body: 'Every issue nothing is blocking, ranked by how much finishing it unlocks.' },
  { icon: Workflow, title: 'See the real order',
    body: 'The graph your backlog already has, inferred from what the issues actually say.' },
  { icon: GitBranch, title: 'Work in parallel, safely',
    body: 'Issues in the same wave are independent — hand them out without collisions.' },
];

export default async function Home() {
  let repos: RepoRow[] = [];
  let offline = false;
  try { repos = await api.repos(); } catch { offline = true; }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <h1 className="text-[32px] font-bold leading-[1.15] tracking-tight sm:text-[40px]">
        Your backlog is a graph.
        <br />
        <span className="text-muted-foreground">Lattice draws it.</span>
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        Paste a GitHub repository. Lattice reads the issues, works out what genuinely
        blocks what, and shows you the order — plus everything you could start right now.
      </p>

      <div className="mt-8 max-w-xl"><RepoForm /></div>

      {offline && (
        <div className="mt-4 max-w-xl rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5">
          <p className="text-[12.5px] text-destructive">
            Backend not reachable — start it with{' '}
            <code className="font-mono">npm start -w @lattice/backend</code>
          </p>
        </div>
      )}

      {repos.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recent
          </h2>
          <ul className="divide-y overflow-hidden rounded-md border bg-card">
            {repos.map((r) => (
              <li key={r.repo}>
                <Link href={`/r/${r.repo}`}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  <MarkGithub className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-[13.5px] font-medium">{r.repo}</span>
                  <span className="ml-auto shrink-0 text-[12px] text-muted-foreground">
                    {r.issues} open
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {VALUE.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <Icon className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="mt-2.5 text-[13.5px] font-semibold">{title}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <p className="mt-16 border-t pt-6 text-[12px] leading-relaxed text-muted-foreground">
        Lattice only reads. It never writes to your repository — no dependencies, no
        comments, no labels.
      </p>
    </main>
  );
}
