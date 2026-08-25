'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '@lattice/types';
import { IssueState } from './Octicon';
import { cn } from '../lib/utils';

export const NODE_W = 264;
export const NODE_H = 86;

/**
 * Styled as a GitHub issue row: state octicon, title, then the metadata line.
 * The familiarity is the point - it should read like something lifted out of
 * the issues list, not a node in an abstract diagram.
 */
export function IssueNode({ data }: NodeProps) {
  const { node, onCritical, dim, selected } = data as {
    node: GraphNode; onCritical: boolean; dim: boolean; selected: boolean;
  };

  return (
    <div
      className={cn(
        'group flex gap-2 rounded-md border bg-card px-3 py-2.5 shadow-sm transition-all duration-150',
        'hover:border-muted-foreground/40 hover:shadow-md',
        selected && 'border-primary ring-2 ring-primary/25',
        onCritical && !selected && 'border-[hsl(var(--critical))]/60',
      )}
      style={{ width: NODE_W, height: NODE_H, opacity: dim ? 0.25 : 1 }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0 !h-1 !w-1" />

      <IssueState state={node.state} className="mt-px shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[12.5px] font-semibold leading-[1.35] text-foreground">
          {node.title}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="font-mono">#{node.number}</span>
          {onCritical && (
            <>
              <span aria-hidden>·</span>
              <span className="font-medium text-[hsl(var(--critical))]">critical path</span>
            </>
          )}
          {node.blastRadius > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="font-medium text-primary">unblocks {node.blastRadius}</span>
            </>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!opacity-0 !h-1 !w-1" />
    </div>
  );
}

/** Row label for a wave. A node so it pans and zooms with the graph. */
export function WaveLabel({ data }: NodeProps) {
  const { wave, count } = data as { wave: number; count: number };
  return (
    <div className="pointer-events-none flex select-none items-baseline gap-2 whitespace-nowrap">
      <span className={cn('text-[13px] font-semibold tracking-tight',
                          wave === 0 ? 'text-[hsl(var(--ready))]' : 'text-foreground')}>
        {wave === 0 ? 'Ready now' : `Wave ${wave}`}
      </span>
      <span className="text-[11.5px] text-muted-foreground">
        {count} {count === 1 ? 'issue' : 'issues'}
        {wave > 0 && ` · after wave ${wave - 1}`}
      </span>
    </div>
  );
}
