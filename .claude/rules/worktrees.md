# Git Worktrees

## Where to create a worktree

- Use the native worktree tool (`EnterWorktree`) to create a worktree. Do not run
  `git worktree add` when the native tool is available.
- If a manual worktree is necessary, create it inside the repository at
  `<repo>/.claude/worktrees/<name>`. Make sure that the path is git-ignored first.
- Do not create a worktree in the root of `/workspace`, or as a sibling of the
  repository.

## Cleanup after a merge

- When the pull request for a worktree that you made is merged, remove that worktree
  and its branch. Do not ask first.
- Before you remove it, make sure that it has no uncommitted files and no commits that
  are not on the default branch. If it has, do not remove it. Tell the user.
- Do not remove a worktree that a different session made, unless the user tells you to.

## Other worktrees

After you clean up your own worktree, count the worktrees that remain in the repository,
not including the main checkout.

- If more than five remain, show the user a list with the name and the last modified
  date of each one, and tell the user that the `cleanup-worktrees` skill can check them.
- If five or fewer remain, do not show the list and do not mention cleanup.

To check which worktrees are merged and which contain unmerged work, use the
`cleanup-worktrees` skill.
