'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '@lattice/types';

export function IssueNode({ data }: NodeProps) {
  const { node, onCritical, dim, selected } = data as {
    node: GraphNode; onCritical: boolean; dim: boolean; selected: boolean;
  };

  const accent = node.ready ? 'var(--ready)' : 'var(--blocked)';
  const border = selected ? 'var(--accent)' : onCritical ? 'var(--critical)' : 'var(--line)';

  return (
    <div
      className="rounded-lg border px-3 py-2.5 transition-all duration-150"
      style={{
        width: 250,
        background: selected ? 'var(--panel-2)' : 'var(--panel)',
        borderColor: border,
        borderWidth: onCritical || selected ? 2 : 1,
        opacity: dim ? 0.2 : 1,
        boxShadow: selected ? '0 0 0 3px rgba(88,166,255,.18)' : 'none',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} />
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent }} />
        <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>#{node.number}</span>
        {onCritical && (
          <span className="text-[9px] font-semibold uppercase tracking-wider px-1 py-px rounded"
                style={{ color: 'var(--critical)', background: 'rgba(240,136,62,.12)' }}>
            critical
          </span>
        )}
        {node.blastRadius > 0 && (
          <span className="ml-auto text-[10px] font-mono px-1.5 py-px rounded shrink-0"
                style={{ background: 'rgba(88,166,255,.12)', color: 'var(--accent)' }}
                title={`Unblocks ${node.blastRadius} issue(s) transitively`}>
            ↓{node.blastRadius}
          </span>
        )}
      </div>
      <div className="text-[12.5px] leading-snug line-clamp-2" style={{ color: 'var(--ink)' }}>
        {node.title}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1 }} />
    </div>
  );
}
