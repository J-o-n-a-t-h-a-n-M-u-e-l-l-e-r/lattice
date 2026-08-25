'use client';
import { Layers2, RefreshCw, Settings2, SlidersHorizontal } from 'lucide-react';
import type { GraphPayload } from '@lattice/types';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MarkGithub } from './Octicon';

export interface ViewOptions {
  reduced: boolean;
  showIsolated: boolean;
}

/**
 * The repo is the subject of the page, so it gets the largest type here and
 * the stats sit under it as supporting detail rather than in a floating chip.
 * View options live behind one control instead of loose checkboxes on the
 * canvas - they are settings, not primary actions.
 */
export function GraphToolbar({
  repo, payload, edgeCount, isolatedCount, options, onChange, onRefresh, refreshing,
}: {
  repo: string;
  payload: GraphPayload;
  edgeCount: number;
  isolatedCount: number;
  options: ViewOptions;
  onChange: (next: ViewOptions) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const { stats } = payload;
  const [owner, name] = repo.split('/');

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b bg-background px-4 py-3 sm:px-6">
      <div className="min-w-0">
        <h1 className="flex items-baseline gap-1 text-[17px] font-semibold tracking-tight">
          <span className="text-muted-foreground">{owner}</span>
          <span className="text-muted-foreground" aria-hidden>/</span>
          <span className="truncate">{name}</span>
        </h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          <span className="font-medium text-[hsl(var(--ready))]">{stats.readyCount} ready to start</span>
          {' · '}{stats.issues} open{' · '}{edgeCount} dependencies
          {stats.waves > 1 && <>{' · '}{stats.waves} waves</>}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" asChild>
              <a href={`https://github.com/${repo}`} target="_blank" rel="noreferrer">
                <MarkGithub className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Repository</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open on GitHub</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? 'animate-spin' : undefined} />
              <span className="hidden sm:inline">{refreshing ? 'Analysing…' : 'Re-analyse'}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Read the issues again and rebuild the graph</TooltipContent>
        </Tooltip>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal />
              <span className="hidden sm:inline">View</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <p className="mb-3 text-[13px] font-semibold">View options</p>

            <label className="flex cursor-pointer items-start gap-3 py-2">
              <Switch checked={options.reduced}
                      onCheckedChange={(v) => onChange({ ...options, reduced: v })} />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[13px] font-medium">
                  <Layers2 className="h-3.5 w-3.5 text-muted-foreground" /> Simplify connections
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                  Hide arrows that repeat what a longer path already says.
                </span>
              </span>
            </label>

            {isolatedCount > 0 && (
              <label className="flex cursor-pointer items-start gap-3 py-2">
                <Switch checked={options.showIsolated}
                        onCheckedChange={(v) => onChange({ ...options, showIsolated: v })} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium">
                    <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Show independent issues
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                    {isolatedCount} issues nothing blocks and that block nothing.
                  </span>
                </span>
              </label>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
