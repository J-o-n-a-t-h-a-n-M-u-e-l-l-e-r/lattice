import { layout, partition, reduce } from '../components/graph-layout';

async function main() {
  const repo = 'J-o-n-a-t-h-a-n-M-u-e-l-l-e-r/lattice';
  const g: any = await (await fetch(
    `http://localhost:3001/api/graph?repo=${encodeURIComponent(repo)}`)).json();
  let edges = g.edges.filter((e: any) => e.blocking);
  edges = reduce(g.nodes, edges);
  const { connected } = partition(g.nodes, edges);
  const laid = layout(connected, edges, { criticalPath: g.criticalPath });

  const byY = new Map<number, Array<{ n: number; x: number }>>();
  for (const n of laid.nodes.filter((x) => x.type === 'issue')) {
    const y = n.position.y;
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y)!.push({ n: Number(n.id), x: Math.round(n.position.x) });
  }
  for (const [y, row] of [...byY.entries()].sort((a, b) => a[0] - b[0])) {
    row.sort((a, b) => a.x - b.x);
    const parts = row.map((r, i) => {
      const gap = i === 0 ? 0 : r.x - row[i - 1]!.x - 264;
      return `${gap > 100 ? `<<${gap}>> ` : ''}#${r.n}@${r.x}`;
    });
    console.log(`  y=${y}: ${parts.join(' ')}`);
  }
}
main();
