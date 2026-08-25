# 10 · Model provider — OpenRouter + Ox Alpha

All inference goes through **OpenRouter**, using the stealth model **Ox Alpha**.

| | |
|---|---|
| Model ID | `stealth/ox-alpha` |
| Base URL | `https://openrouter.ai/api/v1` |
| API shape | OpenAI-compatible chat completions |
| Context | 1,048,576 tokens (1M) |
| Max completion | 131,072 tokens |
| Price | **Free** |
| Tool calling | ✅ `tools` + `tool_choice` |
| `response_format` | ✅ JSON mode |
| **JSON-schema enforcement** | ❌ **not supported** |
| Provider | Anonymous third party (stealth preview) |

Released 2026-08-20. Built for coding, long-horizon agentic work, and reasoning. Accepts text, images, and video.

---

## Two specs that change the design

### 1 · No schema enforcement → force a tool, then validate

`response_format: { type: "json_object" }` gets us *valid JSON*, but nothing guarantees it matches our shape. So we don't rely on it.

**Use forced tool-calling instead.** Declare one tool whose parameters are our edge schema, and force it:

```ts
const res = await client.chat.completions.create({
  model: 'stealth/ox-alpha',
  messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: clusterBlock }],
  tools: [{
    type: 'function',
    function: {
      name: 'emit_edges',
      description: 'Report the blocking dependencies found in this cluster.',
      parameters: EDGE_SCHEMA_JSON,   // JSON Schema, from the Zod schema
    },
  }],
  tool_choice: { type: 'function', function: { name: 'emit_edges' } },
});

const raw = JSON.parse(res.choices[0].message.tool_calls[0].function.arguments);
const parsed = EdgeExtractionSchema.safeParse(raw);   // Zod — the real gate
```

Then, because the schema is a *suggestion* to this model rather than a constraint:

- **Zod-validate every response.** `safeParse`, never `parse`.
- **Retry once on failure**, feeding the validation error back as a user message: *"Your previous response failed validation: `edges[2].confidence` expected number, got string. Return corrected JSON."* One retry fixes almost everything.
- **On a second failure, drop that cluster** and record it. One bad cluster must not fail the run — a partial graph beats no graph.

This is not a workaround, it's the right shape anyway: [`02-inference-pipeline.md`](02-inference-pipeline.md#anti-hallucination-five-guards) already validates hard because the model can produce well-formed nonsense. Schema enforcement would never have caught a fabricated evidence quote.

### 2 · 1M context → clustering is now optional at our scale

The clustering design in [`02-inference-pipeline.md`](02-inference-pipeline.md#l2-candidate-generation--clustering--the-on-answer) exists to solve two different problems, and this model only solves one of them:

| Problem | Still real? |
|---|---|
| **Capacity** — the backlog doesn't fit in context | ❌ Gone. 45 issues is ~30k tokens against a 1M window. |
| **Precision** — a model asked about 45 issues at once attends worse than one asked about 12 | ✅ **Still real.** |

So: **make cluster size configurable, default to a single call for `n ≤ 40`.**

```
--cluster-size 0    # single call, whole backlog (default for small n)
--cluster-size 14   # the clustered path
```

Run both against the gold set (issue #42) and **report which wins**. That comparison is a genuinely interesting result and costs one extra run — the kind of measured finding that reads well in a README.

Practically, for our own 45-issue backlog: start with one call. It's simpler, faster, and it burns one request instead of five against a daily quota that matters (below).

---

## Rate limits — plan for these, they will bite

Free models on OpenRouter:

| Limit | Value |
|---|---|
| Requests / minute | **20** |
| Requests / day, under $10 lifetime credits | **50** |
| Requests / day, $10+ lifetime credits | **1000** |

Rate limiting returns **HTTP 429**.

**Buy $10 of credits before the hackathon.** Fifty requests a day sounds like plenty until you are iterating on a prompt at hour six and each full run costs five. The jump to 1000/day is the difference between developing freely and rationing.

Three things in the code:

1. **Concurrency 5** stays safely under 20/min.
2. **Cache responses to disk, keyed by a hash of (model, system prompt, cluster content).** During prompt iteration you re-run constantly against unchanged clusters; without a cache you burn quota re-deriving identical answers. This is also what makes repeat runs instant during the demo.
3. **Handle 429 explicitly** with a clear message — *"OpenRouter daily quota exhausted; the last completed run is still available, or set `DEMO_MODE=1`"* — rather than a stack trace. A judge hitting this should still see the app.

---

## Prompt caching

Not documented for this model. The byte-stable system prompt advice in [`02-inference-pipeline.md`](02-inference-pipeline.md) still holds — it costs nothing and helps if caching exists — but **do not build a cost argument on it.**

The cost story is simpler now anyway: the model is free. That strengthens the project's amortisation pitch rather than weakening it — *one reasoning pass, then every agent run reads a cached graph* — but the pitch should lead with **ordering correctness**, not price. An agent that starts the UI before the API exists produces garbage at any price, including zero.

---

## Privacy — state this honestly

Per OpenRouter's Stealth Model Terms: **prompts and completions are retained by the provider and are not used for training.** The provider is anonymous.

For this project that's fine — our backlog is a public repo, and issue text is already public.

**It would not automatically be fine elsewhere.** Anyone pointing Lattice at a private or internal backlog is sending issue titles and bodies to an unnamed third party. Put one line in the README saying so, and make the model configurable so an operator can point it at a provider they trust. That's a one-line env var and it turns a liability into evidence of judgement.

---

## Client setup

The OpenAI SDK works directly — no OpenRouter-specific library needed:

```ts
import OpenAI from 'openai';

export const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/J-o-n-a-t-h-a-n-M-u-e-l-l-e-r/lattice',
    'X-Title': 'Lattice',
  },
});
```

Those two headers are optional but get the project listed on OpenRouter's leaderboards — free visibility, and a nice detail to mention.

**Only `apps/backend/src/infer/llm.ts` imports this client.** Model ID and base URL come from env, never hardcoded at a call site. The web app never talks to a model.

---

## Fallback

Ox Alpha is a **stealth preview model and can be withdrawn without notice.** It appeared on 2026-08-20; there is no stability guarantee.

Keep `LATTICE_MODEL` in env so switching is a config change, not a code change. Any OpenAI-compatible OpenRouter model works — pick a paid one with real schema enforcement if Ox Alpha disappears mid-hackathon, and note that the forced-tool + Zod path works on both.

Because the whole model layer sits behind one file and one env var, this fallback costs minutes. That's the point of the seam.
