'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '@lattice/types';
import { NODE_H, NODE_W } from './graph-layout';

export function IssueNode({ data }: NodeProps) {
  const { node, onCritical, dim, selected } = data as {
    node: GraphNode; onCritical: boolean; dim: boolean; selected: boolean;
  };

  const border = selected ? '#58a6ff' : onCritical ? '#f0883e' : '#2a3140';

  return (
    <div
      className="rounded-xl border px-3 py-2.5 flex flex-col gap-1 transition-[opacity,border-color,box-shadow] duration-150"
      style={{
        width: NODE_W, height: NODE_H,
        background: selected ? '#1a1f2b' : '#141821',
        borderColor: border,
        borderWidth: selected || onCritical ? 2 : 1,
        opacity: dim ? 0.15 : 1,
        boxShadow: selected ? '0 0 0 4px rgba(88,166,255,.15)' : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 1, height: 1 }} />
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: node.ready ? '#3fb950' : '#4d5566' }}
              title={node.ready ? 'ready' : `blocked (wave ${node.wave})`} />
        <span className="font-mono text-[11px]" style={{ color: '#8b93a7' }}>#{node.number}</span>
        {onCritical && (
          <span className="text-[9px] font-medium uppercase tracking-wider"
                style={{ color: '#f0883e' }}>critical</span>
        )}
        {node.blastRadius > 0 && (
          <span className="ml-auto text-[10px] font-mono px-1.5 rounded shrink-0"
                style={{ background: 'rgba(88,166,255,.14)', color: '#58a6ff' }}
                title={`Unblocks ${node.blastRadius} issue(s)`}>
            unblocks {node.blastRadius}
          </span>
        )}
      </div>
      <div className="text-[12px] leading-[1.35] overflow-hidden"
           style={{ color: '#e6e9ef', display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' }}>
        {node.title}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
    </div>
  );
}
