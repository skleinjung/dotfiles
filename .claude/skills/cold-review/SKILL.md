---
name: cold-review
description: >
  Adversarial cold (fresh-eyes) review of a pull request or working diff. Fans out
  independent reviewers across dimensions DERIVED FROM THE DIFF, then a panel of skeptics
  with diverse lenses votes on each finding; reports confirmed and contested survivors.
  Use when asked to cold-review, adversarially review, or thoroughly vet the
  implementation of a PR / branch / diff.
---

# Cold review

Run a multi-agent adversarial review of a PR's **implementation**. Reviewers are fresh
(not forks — no authoring bias), the focus areas are derived from the actual diff, and
every finding is voted on by an independent skeptic panel before it's reported.

## Steps

1. **Resolve the target.** From the user's request determine what to review:
   - a PR number / URL → `GH_ORG=<org> gh pr diff <n> -R <org>/<repo>` (pin the org per the
     GitHub-auth rules). Also note the PR's base branch.
   - "this branch" / "my changes" → `git diff <base>...HEAD`, where `base` is the merge-base
     with the default branch unless the user says otherwise.
   - a raw diff the user pasted → save it as-is.
   Capture the repo root path and a one-line title.

2. **Capture the diff to a file** in the scratchpad (do NOT inline a large diff into args):
   e.g. `<scratchpad>/cold-review.diff`. Reviewers read this plus the repo files directly.
   Also record the **list of changed file paths** (from `gh pr diff --name-only` or
   `git diff --name-only`) — you pass these so reviewers can't wander.

   **Target pinning (important).** `repoPath` must be a **local checkout of the PR's repo at
   the PR's head** — which is very often NOT your current working directory (your session may
   sit in a different repo entirely). If the target isn't checked out locally, check it out
   (e.g. a worktree at the PR head) first. The workflow tells every agent to review only the
   diff + files under `repoPath` and never the repo their shell happens to start in, but that
   guard only works if `repoPath` actually points at the right tree.

3. **Capture out-of-scope premises.** If the user named things NOT to relitigate (accepted
   design decisions, known trade-offs — like "don't question storing the token in
   localStorage"), collect them verbatim. Default: none.

4. **Launch the workflow** (bundled next to this file). Pass everything via `args`:

   ```
   Workflow({
     scriptPath: "<dir-of-this-skill>/review-workflow.js",
     args: {
       diffPath: "<abs path to cold-review.diff>",
       repoPath: "<abs local checkout of the PR's repo AT ITS HEAD>",
       changedFiles: ["<path/one>", "<path/two>"],   // from --name-only; pins reviewers
       title: "<short title>",
       outOfScope: "<verbatim premises to skip, or empty>",
       maxDimensions: 6,          // reviewers to fan out (triage picks the most relevant)
       verifiersPerFinding: 3     // skeptic-panel size per finding (keep odd)
     }
   })
   ```

   `Workflow` requires explicit multi-agent opt-in. A cold-review request IS that opt-in —
   proceed. Do not run it for a request that isn't a review.

5. **Relay the report.** When the workflow returns, present its `report` markdown. It has a
   **Confirmed** section (panel majority agreed) and a **Contested** section (split panel —
   lower confidence, surfaced not dropped). Offer to (a) post it as a PR comment and/or
   (b) fix confirmed findings. Treat contested items as "worth a human look," not noise.

## How it stays balanced (noise vs. missed bugs)

The verify stage is a **panel vote with diverse lenses**, not one doubter:

- Each finding goes to `verifiersPerFinding` independent skeptics (default 3), each with a
  different lens — *is it reachable/exploitable*, *is it already mitigated on the real code
  path*, *is it a genuine defect vs. intended behavior*.
- A skeptic may refute a finding **only with a concrete, specific rebuttal**; mere
  uncertainty ("couldn't confirm") is not grounds to refute.
- Decision: **confirmed** if a majority say real; **dropped** only if the panel is
  **unanimous** that it's not real; otherwise **contested** and surfaced separately.

So it takes unanimous skeptic agreement to hide a finding, and a single dissenter keeps it
visible — biased against discarding real findings while still cutting speculative noise.

## Scaling

- Small diff (a few files) → triage picks 3–4 dimensions.
- Large / multi-subsystem diff → up to `maxDimensions` (default 6); the report notes any
  coverage deliberately capped.
- Cost scales as ~`dimensions × (1 + findings × verifiersPerFinding)` agents. For a quick,
  cheaper pass drop `verifiersPerFinding` to 1 (reverts to a single skeptic — noisier-safe
  but able to discard a real finding alone).
- Never let a reviewer OR a skeptic relitigate an `outOfScope` premise — it is threaded
  into every prompt.
