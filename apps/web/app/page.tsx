import { GraphView } from '../components/GraphView';

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <main className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <GraphView repo={params.repo} />
    </main>
  );
}
