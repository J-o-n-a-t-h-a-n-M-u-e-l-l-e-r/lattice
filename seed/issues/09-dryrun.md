# [G] `--dry-run` mode for every GitHub write
<!-- labels: lane:github-io,size:S -->
**What**

A `--dry-run` flag that prints every HTTP call the write path *would* make — method, URL, headers, and the real resolved payload — without sending anything.

**Why it matters**

Three jobs for the price of one:

1. **Development.** Nobody should be testing the write path against real issues by accident.
2. **Verification.** It is how we confirm `databaseId` is being resolved correctly before we trust it — you can read the payload and check the integer.
3. **Demo fallback.** If write permissions or the API preview misbehave on the day, rendering the exact GraphQL/REST payload in the UI still shows judges the mechanism. Several of our fallbacks cost zero precisely because they're things we needed anyway.

The same flag should cover Copilot dispatch, not just dependency writes.

**Scope**

- `src/lib/github/write.ts`, `src/lib/github/copilot.ts`, `scripts/apply.ts`

**Done when**

- [ ] No network call escapes when the flag is set
- [ ] Output is readable enough to paste into a demo
- [ ] Receipt comments are suppressed too

**Depends on:** the write-back path in #7.
