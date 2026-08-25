import type { Edge, ExtractionResult, Issue, Rejection } from '@lattice/types';

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

function tokenOverlap(needle: string, haystack: string): number {
  const a = new Set(needle.split(' ').filter((t) => t.length > 2));
  if (a.size === 0) return 0;
  const b = new Set(haystack.split(' '));
  let hit = 0;
  for (const t of a) if (b.has(t)) hit++;
  return hit / a.size;
}

export interface ValidationOutput {
  kept: Edge[];
  rejected: Rejection[];
}

/**
 * Five guards. Zod catches malformed *shape*; these catch well-formed *nonsense*.
 *
 * There is no human review downstream and no write to GitHub, so this file is
 * the only check on what enters the graph. Treat it as safety-critical: an edge
 * whose evidence cannot be verified is an edge nobody can audit later.
 */
export function validateEdges(
  raw: ExtractionResult['edges'],
  cluster: Issue[],
  given: Edge[],
  suppressed: Set<string>,
): ValidationOutput {
  const allowed = new Set(cluster.map((i) => i.number));
  const text = new Map(cluster.map((i) => [i.number, norm(`${i.title}\n${i.body}`)]));
  const givenReverse = new Set(given.map((g) => `${g.blockedBy}<-${g.blocked}`));

  const kept: Edge[] = [];
  const rejected: Rejection[] = [];
  const reject = (e: typeof raw[number], reason: Rejection['reason']) =>
    rejected.push({ blocked: e.blocked, blockedBy: e.blockedBy, reason,
                    confidence: e.confidence, rationale: e.rationale });

  for (const e of raw) {
    // G1 - ID whitelist. The model may only reference issues it was shown.
    if (!allowed.has(e.blocked) || !allowed.has(e.blockedBy) || e.blocked === e.blockedBy) {
      reject(e, 'unknown_or_self_id');
      continue;
    }

    // G2 - evidence must be a real substring of the cited issue.
    let confidence = e.confidence;
    const hay = text.get(e.evidence.issue) ?? '';
    const quote = norm(e.evidence.quote);
    if (!hay.includes(quote)) {
      // Fuzzy second chance, with a confidence haircut: models paraphrase
      // whitespace and punctuation more often than they fabricate outright.
      if (tokenOverlap(quote, hay) >= 0.85) confidence = Math.max(0, confidence - 0.25);
      else { reject(e, 'fabricated_evidence'); continue; }
    }

    // G4 - given edges win. The model cannot contradict what GitHub records.
    if (givenReverse.has(`${e.blocked}<-${e.blockedBy}`)) {
      reject(e, 'contradicts_given');
      continue;
    }

    // A human said "never propose this again".
    if (suppressed.has(`${e.blocked}<-${e.blockedBy}`)) {
      reject(e, 'suppressed');
      continue;
    }

    kept.push({
      blocked: e.blocked, blockedBy: e.blockedBy, type: e.type,
      confidence, source: 'llm', rationale: e.rationale, evidence: e.evidence,
      // G3 - soft edges are stored and drawn, but never block.
      blocking: false, pinned: false, suppressed: false,
    });
  }

  // G5 - density cap. More than 1.5x the cluster size means the model is
  // pattern-matching on topic rather than reasoning about necessity.
  kept.sort((a, b) => b.confidence - a.confidence);
  const cap = Math.ceil(cluster.length * 1.5);
  for (const e of kept.slice(cap)) {
    rejected.push({ blocked: e.blocked, blockedBy: e.blockedBy, reason: 'density_cap',
                    confidence: e.confidence, rationale: e.rationale });
  }

  return { kept: kept.slice(0, cap), rejected };
}
