---
name: cleanup-worktrees
description: Use when asked to clean up, prune, audit, or list git worktrees in a repository, or to find out which worktrees are already merged and which still contain unmerged work.
---

# Clean Up Worktrees

Find out which worktrees of a repository are safe to remove, remove those, and report the others.

## 1. Get the facts

Run the status script from the repository. It removes nothing.

```
node ~/.claude/skills/cleanup-worktrees/worktree-status.mjs [--json] [--no-gh] [repo-path]
```

The script reports, for each worktree: the branch, the last modified date, the number of uncommitted files, the number of unpushed commits, the pull request, and a verdict.

- It finds a merge by rebase, a squash merge, and a merged pull request.
- It uses `gh` to find the pull request. Use `--no-gh` if `gh` cannot authenticate. The squash check still works.
- Run `git fetch origin` first, so that the default branch is current.

## 2. Read the verdicts

| Verdict | Meaning | Action |
| --- | --- | --- |
| `safe to remove` | No uncommitted files, and the work is on the default branch. | Remove. |
| `empty: safe to remove if no session uses it` | The branch has no commits of its own. | Ask. A different session can be about to use it. |
| `unmerged work: uncommitted changes` | Files are changed or not tracked. | Keep. Report the files. |
| `unmerged work: N commit(s) not on <branch>` | Commits are not merged. | Keep. Report the pull request state. |
| `#N merged, branch has later commits` | Commits were added after the merge. | Keep. Report the later commits. |
| `detached HEAD: check by hand` | No branch. | Look at the commits. Then ask. |
| `locked: leave` | A person or a tool locked the worktree. | Keep. |
| `folder is gone` | The folder was deleted. | Run `git worktree prune`. |
| `main checkout` | The primary checkout. | Never remove. |

Do not remove a worktree on the verdict alone if the result is a surprise. Look at `git log` and `git status` in that worktree first.

## 3. Show the user

Show one table with every worktree other than the main checkout: name, branch, last modified date, and what you will do with it. Sort it with the oldest first.

- Remove the worktrees with the verdict `safe to remove` if this session made them.
- For a worktree that a different session made, show the table and ask before you remove it, even if the verdict is `safe to remove`.

## 4. Remove

For each worktree to remove:

```
git worktree remove <path>
git branch -D <branch>
git push origin --delete <branch>
```

- Use `git branch -D`, because a squash merge makes `git branch -d` refuse.
- A failed remote delete usually means that the host already deleted the branch after the merge. Confirm with `git ls-remote --heads origin <branch>`, then run `git fetch --prune`.
- Never use `git worktree remove --force`. If git refuses, the worktree has work in it. Report that and stop.

## 5. Report

State what you removed, what you kept and why, and what needs a decision from the user.
