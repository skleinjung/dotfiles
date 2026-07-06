export const meta = {
  name: 'cold-review',
  description: 'Adversarial cold review: triage → per-dimension review → skeptic-panel vote → synthesize',
  phases: [
    { title: 'Triage', detail: 'derive review dimensions from the diff' },
    { title: 'Review', detail: 'fresh reviewer per dimension' },
    { title: 'Verify', detail: 'skeptic panel (diverse lenses) votes on each finding' },
    { title: 'Synthesize', detail: 'rank confirmed + surface contested' },
  ],
}

const a = args || {}
const diffPath = a.diffPath
const repoPath = a.repoPath || '(the current repo)'
const title = a.title || 'the diff'
const outOfScope = (a.outOfScope && String(a.outOfScope).trim()) || '(none specified)'
const MAX_DIMS = a.maxDimensions || 6
const PANEL = Math.max(1, a.verifiersPerFinding || 3)
const changedFiles = Array.isArray(a.changedFiles) ? a.changedFiles : []

const BASE = `You are performing a COLD, ADVERSARIAL implementation review of a SPECIFIC code change.
Title: ${title}

=== TARGET — review ONLY this ===
The change is ENTIRELY described by the unified diff at:
  ${diffPath}
Every file it touches lives under this repo root:
  ${repoPath}
${changedFiles.length ? `The changed files (relative to that root) are:\n${changedFiles.map((f) => '  - ' + f).join('\n')}\n` : ''}
CRITICAL — target pinning: your shell may start in a DIFFERENT, UNRELATED git repository than the
one under review. Do NOT run git in your default working directory, do NOT inspect recent commits/
PRs of whatever repo your cwd happens to be in, and do NOT review any file outside the target above.
For any git or file inspection, operate under ${repoPath} explicitly — e.g. \`git -C "${repoPath}"\`,
or read absolute paths under it. If what you're looking at isn't in the diff above, it is not in
scope. First read the diff file to see exactly what changed, then read the touched files under the
repo root to reason about real runtime behavior.

OUT OF SCOPE — do NOT raise or relitigate these; they are accepted decisions, not defects:
${outOfScope}

Hunt for concrete IMPLEMENTATION defects a careful reviewer would flag. Reason about runtime
behavior, not source appearance (regexes/strings compile to real values; config has real
effects; async code has real ordering; a handle either keeps the event loop alive or it
doesn't). Prefer a few HIGH-CONFIDENCE, concretely wrong-or-exploitable findings over style nits.`

// ---- Triage: derive the review dimensions FROM THE DIFF (nothing hardcoded) --------------
phase('Triage')
const TRIAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    dimensions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          key: { type: 'string', description: 'short kebab id, e.g. web-xss, async-races, sql-injection' },
          focus: { type: 'string', description: 'what THIS reviewer hunts for, specific to this diff + named files/functions' },
          files: { type: 'array', items: { type: 'string' } },
        },
        required: ['key', 'focus', 'files'],
      },
    },
  },
  required: ['summary', 'dimensions'],
}
const triage = await agent(
  `${BASE}

Read the diff and the touched files, then choose the ${MAX_DIMS} MOST RELEVANT review dimensions
for THIS change — do not use a fixed checklist. Draw from (and adapt beyond) this menu as the code
warrants:
- injection / XSS / SSRF / path-traversal / deserialization
- authn / authz / secrets handling / crypto misuse
- correctness & edge cases (null/undefined, off-by-one, error handling, dead/unreachable code)
- async / concurrency / resource lifecycle (races, unawaited or never-settling promises, leaked
  handles/sockets, event-loop / process-exit / signal behavior)
- API / contract / backward-compat / schema / types
- data & persistence (transactions, migrations, injection)
- config / deploy / infra (Dockerfile, compose, CI, restart/health/signal behavior, env/secrets)
- tests (do they actually exercise the change, or give false confidence)
- performance (N+1, blocking, allocation)
- internal consistency (code vs its own docs/comments vs tests)

For each dimension give a specific 'focus' referencing the real files/functions involved. Skip
dimensions the diff doesn't touch. Return at most ${MAX_DIMS}.`,
  { schema: TRIAGE_SCHEMA, phase: 'Triage', label: 'triage' },
)
const DIMENSIONS = (triage?.dimensions || []).slice(0, MAX_DIMS)
log(`triage picked ${DIMENSIONS.length} dimension(s): ${DIMENSIONS.map((d) => d.key).join(', ') || '(none)'}`)
if (DIMENSIONS.length === 0) {
  return { confirmed: [], contested: [], report: `Triage found no reviewable dimensions in ${title}.` }
}

// ---- schemas ----------------------------------------------------------------------------
const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    dimension: { type: 'string' },
    clean: { type: 'boolean' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          detail: { type: 'string', description: 'what is wrong + a concrete trigger/impact' },
          suggested_fix: { type: 'string' },
        },
        required: ['title', 'file', 'line', 'severity', 'detail', 'suggested_fix'],
      },
    },
  },
  required: ['dimension', 'clean', 'findings'],
}
const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    refuted: { type: 'boolean', description: 'true ONLY if you can give a concrete, specific rebuttal' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string', description: 'the concrete rebuttal, or why the finding holds up' },
    corrected_severity: { type: 'string', enum: ['high', 'medium', 'low', 'none'] },
  },
  required: ['refuted', 'confidence', 'reasoning', 'corrected_severity'],
}

// Diverse skeptic lenses — cycled across the panel so verifiers catch different failure modes.
const LENSES = [
  `REACHABILITY lens: can this actually be triggered? Construct the concrete input/state/path that
   reaches it, or demonstrate it is unreachable. Unreachable ⇒ refute.`,
  `MITIGATION lens: is this already prevented on the REAL code path (validation, types, an upstream
   guard, a framework default)? Trace the path. Genuinely mitigated ⇒ refute.`,
  `INTENT lens: is this a genuine defect, or intended behavior consistent with the tests/docs/specs?
   If a test or documented contract sanctions it, it is not a defect ⇒ refute.`,
]

const SEV_RANK = { none: 0, low: 1, medium: 2, high: 3 }
const RANK_SEV = ['none', 'low', 'medium', 'high']

// ---- Review → Verify (pipeline; each dimension verifies as its review lands) -------------
const reviewed = await pipeline(
  DIMENSIONS,
  (d) =>
    agent(
      `${BASE}\n\nYOUR DIMENSION (${d.key}). Focus: ${d.focus}\nRelevant files: ${d.files.join(', ')}\n` +
        `If this dimension is genuinely clean, say so explicitly (clean=true) rather than inventing nits.`,
      { label: `review:${d.key}`, phase: 'Review', schema: FINDINGS_SCHEMA },
    ),
  (result, d) => {
    if (!result || result.clean || !result.findings?.length) return { dimension: d.key, verified: [] }
    return parallel(
      result.findings.map((f) => () => {
        const panel = Array.from({ length: PANEL }, (_, i) =>
          agent(
            `You are an independent skeptic on a review panel for ${title}. Read the ACTUAL code under
${repoPath} yourself — do not trust the finding's description. TARGET PINNING: only inspect files under
${repoPath} (use \`git -C "${repoPath}"\` for git); never review whatever repo your shell's default
working directory happens to be — it may be unrelated.

${LENSES[i % LENSES.length]}

Rule of evidence: you may set refuted=true ONLY if you can state a specific, concrete reason the
finding is wrong, unreachable, already mitigated on the real path, out-of-scope (${outOfScope}), or a
pure style nit. Mere uncertainty ("I couldn't confirm it") is NOT grounds to refute — if the finding
is concrete and you cannot specifically rebut it, set refuted=false. Reason about real runtime behavior.

FINDING:
title: ${f.title}
file: ${f.file}:${f.line}
severity: ${f.severity}
detail: ${f.detail}
suggested_fix: ${f.suggested_fix}`,
            { label: `verify:${d.key}:${(f.file || '').split('/').pop()}#${(i + 1).toString()}`, phase: 'Verify', schema: VERDICT_SCHEMA },
          ),
        )
        return Promise.all(panel).then((verdicts) => {
          const vs = verdicts.filter(Boolean)
          const realVotes = vs.filter((v) => !v.refuted)
          const n = vs.length || 1
          // majority real ⇒ confirmed; unanimous refute ⇒ dropped; anything between ⇒ contested
          const status = realVotes.length * 2 > n ? 'confirmed' : realVotes.length >= 1 ? 'contested' : 'refuted'
          // final severity = most severe corrected value among the "real" voters (keep its teeth),
          // else fall back to the reviewer's severity.
          const finalSeverity =
            realVotes.length > 0
              ? RANK_SEV[Math.max(...realVotes.map((v) => SEV_RANK[v.corrected_severity] ?? 0))]
              : f.severity
          return { ...f, dimension: d.key, status, realVotes: realVotes.length, panel: n, finalSeverity, verdicts: vs }
        })
      }),
    ).then((vs) => ({ dimension: d.key, verified: vs.filter(Boolean) }))
  },
)

const all = reviewed.filter(Boolean).flatMap((r) => r.verified)
const confirmed = all.filter((f) => f.status === 'confirmed' && f.finalSeverity !== 'none')
const contested = all.filter((f) => f.status === 'contested' && f.finalSeverity !== 'none')
const droppedCount = all.length - confirmed.length - contested.length
const cleanDims = DIMENSIONS.map((d) => d.key).filter((k) => !all.some((f) => f.dimension === k && f.status !== 'refuted'))
log(`confirmed ${confirmed.length}, contested ${contested.length}, dropped ${droppedCount}; clean/refuted dims: ${cleanDims.join(', ') || 'none'}`)

if (confirmed.length === 0 && contested.length === 0) {
  return {
    confirmed: [],
    contested: [],
    report: `Cold review of ${title} found no surviving implementation defects (${droppedCount} finding(s) raised and unanimously refuted). Dimensions reviewed: ${DIMENSIONS.map((d) => d.key).join(', ')}.`,
  }
}

// ---- Synthesize -------------------------------------------------------------------------
phase('Synthesize')
const slim = (f) => ({
  title: f.title,
  file: f.file,
  line: f.line,
  severity: f.finalSeverity,
  votes: `${f.realVotes.toString()}/${f.panel.toString()} real`,
  detail: f.detail,
  suggested_fix: f.suggested_fix,
})
const report = await agent(
  `Write a concise, honest cold-review report for ${title}. Use two sections:

## Confirmed  (panel majority agreed these are real)
## Contested  (split panel — lower confidence, a human should judge; do NOT drop them)

Within each, group by severity (high→low), dedupe overlaps, and for each finding give: a one-line
title, file:line, the vote (e.g. 2/3), the concrete problem + trigger, and the suggested fix. Add a
one-line summary at the top. Do NOT re-raise out-of-scope premises (${outOfScope}). End with a brief
line naming dimensions that were clean and the count of unanimously-refuted findings.
Output GitHub-flavored markdown.

CONFIRMED (JSON):
${JSON.stringify(confirmed.map(slim), null, 2)}

CONTESTED (JSON):
${JSON.stringify(contested.map(slim), null, 2)}

DIMENSIONS REVIEWED: ${DIMENSIONS.map((d) => d.key).join(', ')}
CLEAN DIMENSIONS: ${cleanDims.join(', ') || 'none'}
UNANIMOUSLY REFUTED (dropped): ${droppedCount.toString()}`,
  { label: 'synthesize', phase: 'Synthesize' },
)

return { confirmedCount: confirmed.length, contestedCount: contested.length, confirmed, contested, report }
