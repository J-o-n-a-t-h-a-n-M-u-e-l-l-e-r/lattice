import { layout, partition, reduce } from '../components/graph-layout';

async function main() {
  const repo = 'albabxh-bit/storefront';
  const g: any = await (await fetch(
    `http://localhost:3001/api/graph?repo=${encodeURIComponent(repo)}`)).json();
  let edges = g.edges.filter((e: any) => e.blocking);
  edges = reduce(g.nodes, edges);
  const { connected, isolated } = partition(g.nodes, edges);
  const independent = new Set(isolated.map((n: any) => n.number));

  const off = layout(connected, edges, { criticalPath: g.criticalPath });
  const on = layout([...connected, ...isolated], edges,
    { criticalPath: g.criticalPath, independent });

  const cards = (l: any) => l.nodes.filter((n: any) => n.type === 'issue');
  const flagged = cards(on).filter((n: any) => (n.data as any).independent);

  console.log(`  toggle off : ${cards(off).length} cards drawn`);
  console.log(`  toggle on  : ${cards(on).length} cards drawn (+${cards(on).length - cards(off).length})`);
  console.log(`  independent issues            : ${isolated.length}`);
  console.log(`  flagged in the graph          : ${flagged.length}`);
  console.log(`  every independent is flagged  : ${flagged.length === isolated.length ? 'YES' : 'NO'}`);
  console.log(`  no connected issue is flagged : ${
    flagged.every((n: any) => independent.has(Number(n.id))) ? 'YES' : 'NO'}`);
  console.log(`  none flagged when toggle off  : ${
    cards(off).every((n: any) => !(n.data as any).independent) ? 'YES' : 'NO'}`);
  console.log(`  crossings unchanged           : ${off.crossings} -> ${on.crossings}`);
  console.log();
  console.log('  sample chips (number + title):');
  for (const n of isolated.slice(0, 4)) console.log(`    #${n.number}  ${n.title.slice(0, 52)}`);
}
main();
