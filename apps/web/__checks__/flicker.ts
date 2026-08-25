import { decorate, layout, partition, reduce, connectedSet } from '../components/graph-layout';

async function main() {
const res = await fetch('http://localhost:3001/api/graph?repo=albabxh-bit/storefront');
const g: any = await res.json();

let edges = g.edges.filter((e: any) => e.blocking);
edges = reduce(g.nodes, edges);
const { connected } = partition(g.nodes, edges);

// 1. Layout must be deterministic - if positions drift between calls, the card
//    under the cursor moves, which re-fires mouseleave/mouseenter.
const a = layout(connected, edges, { criticalPath: g.criticalPath });
const b = layout(connected, edges, { criticalPath: g.criticalPath });
const posA = JSON.stringify(a.nodes.map((n) => [n.id, n.position.x, n.position.y]));
const posB = JSON.stringify(b.nodes.map((n) => [n.id, n.position.x, n.position.y]));
console.log(`  layout deterministic:        ${posA === posB ? 'YES' : 'NO — positions drift!'}`);

// 2. Hovering must not move anything.
const target = Number(a.nodes.find((n) => n.type === 'issue')!.id);
const hovered = decorate(a, { highlight: connectedSet(target, edges), selected: null });
const posH = JSON.stringify(hovered.nodes.map((n) => [n.id, n.position.x, n.position.y]));
console.log(`  positions stable on hover:   ${posA === posH ? 'YES' : 'NO'}`);

// 3. Untouched nodes must keep object identity, so React skips those subtrees.
const same = hovered.nodes.filter((n, i) => n === a.nodes[i]).length;
const changed = hovered.nodes.length - same;
console.log(`  nodes reused by reference:   ${same}/${hovered.nodes.length} (${changed} restyled)`);

// 4. No-op decorate must be a complete identity pass.
const noop = decorate(a, { highlight: null, selected: null });
const allSame = noop.nodes.every((n, i) => n === a.nodes[i])
             && noop.edges.every((e, i) => e === a.edges[i]);
console.log(`  no-op decorate is identity:  ${allSame ? 'YES' : 'NO'}`);
}
main();
