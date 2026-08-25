import type { NextConfig } from 'next';

/**
 * `next build` and `next dev` write to the same .next directory by default, so
 * running a build while the dev server is up replaces its artifacts underneath
 * it and every route dies with `__webpack_modules__[moduleId] is not a
 * function`. Builds go somewhere else entirely.
 */
const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  transpilePackages: ['@lattice/types'],
};

export default config;
