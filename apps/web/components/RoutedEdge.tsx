'use client';
import { BaseEdge, type EdgeProps } from '@xyflow/react';

/**
 * An edge that follows its dummy-node waypoints instead of cutting a straight
 * line through the layers between its endpoints.
 *
 * Catmull-Rom through the points, converted to cubic beziers, so a long edge
 * reads as one smooth curve that visibly goes *around* the rows it passes.
 */
export function RoutedEdge({
  id, sourceX, sourceY, targetX, targetY, markerEnd, style, data,
}: EdgeProps) {
  const via = (data?.via as Array<{ x: number; y: number }> | undefined) ?? [];
  const pts = [{ x: sourceX, y: sourceY }, ...via, { x: targetX, y: targetY }];

  let d = `M ${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    // Catmull-Rom -> cubic bezier control points (tension 1/6).
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }

  return <BaseEdge id={id} path={d} markerEnd={markerEnd} style={style} />;
}
