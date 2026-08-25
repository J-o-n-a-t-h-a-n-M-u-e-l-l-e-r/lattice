import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import type { NextConfig } from 'next';

/**
 * `next build` and `next dev` both write to .next by default, so building while
 * the dev server is up replaces its chunks underneath it and every route dies
 * with `__webpack_modules__[moduleId] is not a function` or MODULE_NOT_FOUND.
 *
 * The split is decided from the build phase rather than an env var in an npm
 * script, because `npx next build` bypasses the script - which is exactly how
 * this broke twice.
 */
export default function config(phase: string): NextConfig {
  return {
    distDir: phase === PHASE_PRODUCTION_BUILD ? '.next-build' : '.next',
    transpilePackages: ['@lattice/types'],
  };
}
