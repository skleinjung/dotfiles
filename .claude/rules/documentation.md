# Documentation and Comments

## Avoid Awkward Phrases

Avoid the following awkward-to-read AI words and phrases, especially in permanent 
documentation:

- substrate
- "<something> does X -- never Y"

## Describe the final state, not the path to it

Comments, docs, commit bodies, and PR descriptions must describe the change as it
stands — not narrate what earlier drafts of *this same change* tried, removed, or
replaced. Cut "negative space" commentary that only makes sense relative to a
superseded version:

- ✗ "a separate role rather than widening the existing one"
- ✗ "changed from the original approach" / "no longer does X" / "Option 2 (the one we picked)"
- ✓ "Dedicated CDK deploy role, scoped to assuming the cdk-* bootstrap roles"

**Test**: would the sentence still make sense to a reader who never saw the earlier drafts?
If not, delete it. Contrasting with behavior that **predates** the change (and that the
change supersedes) is fine — that's context, not churn.

**Exception**: If the documentation or comment is meant to specifically highlight why
a particular decision was made. This type of commentary should be brief, and only used
when the motivation is non-obvious or the choice might appear sub-optimal without context.

## Keep open-PR descriptions in sync

When you push new commits to a branch that already has an open PR, re-read the PR title
and description and update them if the change has moved on. The squash-merge commit is
built from the PR title + description, **not** the intermediate commits — so a stale
description becomes the permanent record on `main`. Patch it when it drifts
(`gh api --method PATCH repos/<owner>/<repo>/pulls/<n> -F body=@file`).

The two halves reinforce each other: when a push changes direction, refresh the PR description — and
write that refreshed description as the final design, not a diff against the draft it replaced.
