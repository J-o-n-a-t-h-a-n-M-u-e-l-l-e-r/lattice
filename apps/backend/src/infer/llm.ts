import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import { ExtractionResult, type Issue } from '@lattice/types';
import { cacheGet, cachePut } from '../store/index.js';

/** The ONLY file that imports the model client. Model + base URL come from env. */

export const MODEL = process.env.LATTICE_MODEL ?? 'stealth/ox-alpha';
const BASE_URL = process.env.LATTICE_MODEL_BASE_URL ?? 'https://openrouter.ai/api/v1';

function client(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');
  return new OpenAI({
    apiKey, baseURL: BASE_URL,
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/J-o-n-a-t-h-a-n-M-u-e-l-l-e-r/lattice',
      'X-Title': 'Lattice',
    },
  });
}

/**
 * Byte-stable. Keeping it constant makes the cache key stable and lets the
 * provider cache the prefix if it supports it.
 *
 * Three lines carry most of the precision: the operational test ("would have to
 * be substantially redone"), which turns vague relatedness into a falsifiable
 * claim; the density expectation, a prior against over-generation; and the
 * prose-dependency instruction, which does the job a regex layer used to.
 */
export const SYSTEM_PROMPT = `You extract BLOCKING DEPENDENCIES between software issues in one backlog.

A blocking dependency A -> B means: work on B cannot be COMPLETED, or would have
to be substantially redone, until A is done. It is a statement about engineering
necessity, not about topic similarity, team, priority, or narrative order.

Classify every edge you emit as exactly one of:
- hard_blocker: B's implementation is impossible until A exists.
  (A creates the table B queries; A adds the endpoint B calls.)
- data_contract: B consumes a type, schema, API shape or config key that A defines.
  Without A, B would be coding against a guess.
- shared_artifact: A and B modify the same file or module such that doing them
  concurrently produces a merge conflict or duplicated work. Order matters.
- ordering_preference: it is merely more pleasant to do A first. NOT a blocker.

DO NOT emit an edge when the only relationship is:
- same feature area, same milestone, same label, same author
- one issue merely MENTIONS the other
- both are "part of the auth work"
- one is a bug in code the other touches, unless the fix depends on the other landing

The correct answer for most pairs is NO EDGE. A backlog of 12 issues typically has
between 2 and 8 real blocking edges. If you emit more than 1.5x the number of
issues, you are pattern-matching on topic, not reasoning about necessity.

If an issue states its own dependencies in prose ("depends on #12", "after the
schema lands"), treat that as strong evidence and quote it.

RULES:
1. Only use issue numbers from the provided list. Never invent a number.
2. Every edge MUST include evidence: a VERBATIM span of <=160 chars copied
   character-for-character from the title or body of one of the two issues, which
   is the specific text that made you believe this. If you cannot copy such a span,
   do not emit the edge.
3. confidence is your probability the edge is real, honestly calibrated.
   Use the full range. Below 0.5 means "probably not".
4. Never emit both A->B and B->A. Pick the direction where the DEPENDENT work is
   the one that consumes the other's output. If genuinely bidirectional, the issues
   should be merged - emit nothing and note it in notes.
5. effort_days per issue: your estimate of implementation days (0.5, 1, 2, 3, 5).

Call the emit_edges function with your result.`;

const EDGE_SCHEMA = {
  type: 'object',
  properties: {
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blocked: { type: 'integer', description: 'issue number that is blocked' },
          blockedBy: { type: 'integer', description: 'issue number that blocks it' },
          type: {
            type: 'string',
            enum: ['hard_blocker', 'data_contract', 'shared_artifact', 'ordering_preference'],
          },
          confidence: { type: 'number' },
          rationale: { type: 'string' },
          evidence: {
            type: 'object',
            properties: { issue: { type: 'integer' }, quote: { type: 'string' } },
            required: ['issue', 'quote'],
          },
        },
        required: ['blocked', 'blockedBy', 'type', 'confidence', 'rationale', 'evidence'],
      },
    },
    estimates: {
      type: 'array',
      items: {
        type: 'object',
        properties: { issue: { type: 'integer' }, effort_days: { type: 'number' } },
        required: ['issue', 'effort_days'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['edges'],
} as const;

export function renderCluster(issues: Issue[], given: Array<[number, number]>): string {
  const body = issues.map((i) => {
    const labels = i.labels.join(',');
    const text = i.body.slice(0, 1500).split('\r').join('');
    const indented = text.split('\n').map((l) => '  ' + l).join('\n');
    return `<issue number="${i.number}" labels="${labels}" milestone="${i.milestone ?? ''}">
title: ${i.title}
body: |
${indented}
</issue>`;
  }).join('\n');

  const known = given.length
    ? '\n\nAlready-known dependencies (do not re-emit; treat as ground truth context):\n' +
      given.map(([b, bb]) => `  ${b} blocked_by ${bb}`).join('\n')
    : '';

  return `Issues in this cluster (you may ONLY reference these numbers):\n\n${body}${known}`;
}

export interface ExtractionOutcome {
  result: ExtractionResult | null;
  requests: number;
  cacheHit: boolean;
  error?: string;
}

/**
 * Ox Alpha does NOT enforce JSON schemas, so the forced tool call is a strong
 * hint and Zod is the real gate. safeParse, never parse; one retry with the
 * validation error fed back; then give up on this cluster rather than the run.
 */
export async function extractEdges(
  issues: Issue[], given: Array<[number, number]>,
): Promise<ExtractionOutcome> {
  const userContent = renderCluster(issues, given);
  const key = createHash('sha256')
    .update(MODEL).update(' ').update(SYSTEM_PROMPT).update(' ').update(userContent)
    .digest('hex');

  const cached = await cacheGet(key);
  if (cached) {
    const parsed = ExtractionResult.safeParse(cached);
    if (parsed.success) return { result: parsed.data, requests: 0, cacheHit: true };
  }

  const openai = client();
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];
  let requests = 0;
  let lastError = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    requests++;
    let raw: unknown;
    try {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools: [{
          type: 'function',
          function: {
            name: 'emit_edges',
            description: 'Report the blocking dependencies found in this cluster.',
            parameters: EDGE_SCHEMA as unknown as Record<string, unknown>,
          },
        }],
        tool_choice: { type: 'function', function: { name: 'emit_edges' } },
      });
      const call = res.choices[0]?.message?.tool_calls?.[0];
      const args = call && 'function' in call ? call.function.arguments : undefined;
      const text = args ?? res.choices[0]?.message?.content ?? '';
      raw = JSON.parse(stripFences(text));
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      messages.push({
        role: 'user',
        content: `Your previous response could not be parsed: ${lastError}. Return valid JSON via the emit_edges function.`,
      });
      continue;
    }

    const parsed = ExtractionResult.safeParse(raw);
    if (parsed.success) {
      await cachePut(key, MODEL, parsed.data);
      return { result: parsed.data, requests, cacheHit: false };
    }
    lastError = parsed.error.issues.slice(0, 4)
      .map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    messages.push({
      role: 'user',
      content: `Your previous response failed validation: ${lastError}. Return corrected JSON via the emit_edges function.`,
    });
  }

  // One bad cluster must not fail the run - a partial graph beats no graph.
  return { result: null, requests, cacheHit: false, error: lastError };
}

function stripFences(s: string): string {
  const m = /```(?:json)?\s*([\s\S]*?)```/.exec(s);
  return (m?.[1] ?? s).trim();
}
