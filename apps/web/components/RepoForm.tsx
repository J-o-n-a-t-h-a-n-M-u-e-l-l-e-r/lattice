'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from './ui/button';
import { MarkGithub } from './Octicon';

function normalise(input: string): string | null {
  const s = input.trim().replace(/\.git$/, '');
  const url = /github\.com[/:]([^/]+)\/([^/?#]+)/i.exec(s);
  if (url) return `${url[1]}/${url[2]}`;
  const plain = /^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/.exec(s);
  return plain ? `${plain[1]}/${plain[2]}` : null;
}

export function RepoForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const repo = normalise(value);
    if (!repo) { setError('Try owner/repo, or paste a GitHub URL.'); return; }
    setBusy(true); setError(null);
    try { await api.startRun(repo); router.push(`/r/${repo}`); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <MarkGithub className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            placeholder="owner/repo"
            spellCheck={false} autoFocus
            aria-label="GitHub repository"
            aria-invalid={!!error}
            className="h-11 w-full rounded-md border bg-card pl-9 pr-3 text-[14px] shadow-sm outline-none
                       transition-colors placeholder:text-muted-foreground
                       focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <Button type="submit" size="lg" disabled={busy} className="h-11 shrink-0">
          {busy ? 'Starting…' : <>Map dependencies <ArrowRight className="h-4 w-4" /></>}
        </Button>
      </div>
      {error
        ? <p role="alert" className="mt-2 text-[12.5px] text-destructive">{error}</p>
        : <p className="mt-2 text-[12.5px] text-muted-foreground">
            Any public repository. A first analysis takes a few minutes.
          </p>}
    </form>
  );
}
