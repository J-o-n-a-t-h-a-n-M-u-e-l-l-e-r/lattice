import { layout, partition, reduce } from '../components/graph-layout';

async function main() {
for (const repo of ['albabxh-bit/storefront', 'J-o-n-a-t-h-a-n-M-u-e-l-l-e-r/lattice']) {
  const g: any = await (await fetch(
    `http://localhost:3001/api/graph?repo=${encodeURIComponent(repo)}`)).json();
  let edges = g.edges.filter((e: any) => e.blocking);
  edges = reduce(g.nodes, edges);
  const { connected } = partition(g.nodes, edges);
  const laid = layout(connected, edges, { criticalPath: g.criticalPath });

  // component id per issue, so a gap can be attributed
  const comp = new Map<number, number>();
  let next = 0;
  const adj = new Map<number, number[]>();
  for (const e of edges) {
    (adj.get(e.blocked) ?? adj.set(e.blocked, []).get(e.blocked)!).push(e.blockedBy);
    (adj.get(e.blockedBy) ?? adj.set(e.blockedBy, []).get(e.blockedBy)!).push(e.blocked);
  }
  for (const n of connected) {
    if (comp.has(n.number)) continue;
    const id = next++; const stack = [n.number];
    while (stack.length) {
      const v = stack.pop()!;
      if (comp.has(v)) continue;
      comp.set(v, id);
      for (const w of adj.get(v) ?? []) if (!comp.has(w)) stack.push(w);
    }
  }

  const issues = laid.nodes.filter((n) => n.type === 'issue');
  const byY = new Map<number, Array<{ x: number; c: number }>>();
  for (const n of issues) {
    const y = n.position.y;
    if (!byY.has(y)) byY.set(y, []);
    byY.get(y)!.push({ x: n.position.x, c: comp.get(Number(n.id)) ?? -1 });
  }
  let intra = 0, inter = 0;
  for (const row of byY.values()) {
    row.sort((a, b) => a.x - b.x);
    for (let i = 1; i < row.length; i++) {
      const gap = row[i]!.x - row[i - 1]!.x - 264;
      if (row[i]!.c === row[i - 1]!.c) intra = Math.max(intra, gap);
      else inter = Math.max(inter, gap);
    }
  }
  const xs = issues.map((n) => n.position.x);
  console.log(`  ${repo}`);
  console.log(`    ${issues.length} cards in ${next} tree(s), width ${Math.round(Math.max(...xs) + 264 - Math.min(...xs))}px`);
  console.log(`    worst gap inside one tree : ${Math.round(intra)}px`);
  console.log(`    worst gap between trees   : ${Math.round(inter)}px`);
}
}
main();
