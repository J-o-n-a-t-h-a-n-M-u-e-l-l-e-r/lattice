export function defaultRepo(): string {
  const owner = process.env.LATTICE_OWNER;
  const repo = process.env.LATTICE_REPO;
  if (owner && repo) return `${owner}/${repo}`;
  return process.env.LATTICE_DEFAULT_REPO ?? 'J-o-n-a-t-h-a-n-M-u-e-l-l-e-r/lattice';
}
