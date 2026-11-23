#!/usr/bin/env node
// Reports the state of each git worktree of a repository. It removes nothing.
// Usage: node worktree-status.mjs [--json] [--no-gh] [repo-path]

import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { basename, join } from 'node:path'

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const useGh = !args.includes('--no-gh')
const repo = args.find((a) => !a.startsWith('--')) ?? process.cwd()

/** Runs a command and returns trimmed stdout, or null if the command fails. */
const run = (cmd, cmdArgs, cwd = repo, timeout = 20000) => {
  try {
    return execFileSync(cmd, cmdArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout }).trim()
  } catch {
    return null
  }
}
const git = (cmdArgs, cwd) => run('git', cmdArgs, cwd)

if (git(['rev-parse', '--git-dir']) === null) {
  console.error(`Not a git repository: ${repo}`)
  process.exit(2)
}

const defaultBranch =
  git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']) ??
  (git(['rev-parse', '--verify', '--quiet', 'origin/main']) ? 'origin/main' : 'main')

const originUrl = git(['remote', 'get-url', 'origin']) ?? ''
const slug = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/.exec(originUrl)?.[1] ?? null

/** Parses `git worktree list --porcelain` into records. */
const listWorktrees = () =>
  (git(['worktree', 'list', '--porcelain']) ?? '')
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      const record = {}
      for (const line of block.split('\n')) {
        const [key, ...rest] = line.split(' ')
        record[key] = rest.join(' ') || true
      }
      return record
    })

/** True if the squash of the branch is already a commit on the default branch. */
const isSquashMerged = (head) => {
  const base = git(['merge-base', defaultBranch, head])
  if (!base) return false
  const squashed = git(['commit-tree', `${head}^{tree}`, '-p', base, '-m', 'squash-check'])
  if (!squashed) return false
  return (git(['cherry', defaultBranch, squashed]) ?? '').startsWith('-')
}

const pullRequest = (branch) => {
  if (!useGh || !slug || !branch) return null
  const out = run('gh', [
    'pr', 'list', '-R', slug, '--head', branch, '--state', 'all', '--limit', '1',
    '--json', 'number,state,headRefOid',
  ])
  try {
    return JSON.parse(out ?? '[]')[0] ?? null
  } catch {
    return null
  }
}

const day = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 10)

const describe = (wt, index) => {
  const path = wt.worktree
  const branch = typeof wt.branch === 'string' ? wt.branch.replace('refs/heads/', '') : null
  const head = wt.HEAD
  const dirty = (git(['status', '--porcelain'], path) ?? '').split('\n').filter(Boolean)

  let modified = Number(git(['log', '-1', '--format=%ct', head]) ?? 0)
  for (const line of dirty) {
    try {
      modified = Math.max(modified, Math.floor(statSync(join(path, line.slice(3).split(' -> ').pop())).mtimeMs / 1000))
    } catch {
      // Deleted file. Keep the commit date.
    }
  }

  const ahead = Number(git(['rev-list', '--count', `${defaultBranch}..${head}`]) ?? 0)
  const upstream = branch ? git(['rev-parse', '--abbrev-ref', `${branch}@{upstream}`]) : null
  const unpushed = upstream ? Number(git(['rev-list', '--count', `${upstream}..${head}`]) ?? 0) : null
  const pr = ahead > 0 ? pullRequest(branch) : null

  let merged = 'no'
  if (ahead === 0) merged = 'no commits of its own'
  else if (isSquashMerged(head)) merged = 'squash-merged'
  else if (pr?.state === 'MERGED' && pr.headRefOid === head) merged = `merged in #${pr.number}`
  else if (pr?.state === 'MERGED') merged = `#${pr.number} merged, branch has later commits`

  let verdict
  if (index === 0) verdict = 'main checkout'
  else if (wt.prunable) verdict = 'folder is gone: run git worktree prune'
  else if (wt.locked) verdict = 'locked: leave'
  else if (dirty.length > 0) verdict = 'unmerged work: uncommitted changes'
  else if (!branch) verdict = 'detached HEAD: check by hand'
  else if (merged === 'no commits of its own') verdict = 'empty: safe to remove if no session uses it'
  else if (merged === 'squash-merged' || merged.startsWith('merged in')) verdict = 'safe to remove'
  else verdict = `unmerged work: ${ahead} commit(s) not on ${defaultBranch}`

  return {
    name: basename(path),
    path,
    branch,
    lastModified: day(modified),
    uncommittedFiles: dirty.length,
    commitsNotOnDefault: ahead,
    upstream,
    unpushedCommits: unpushed,
    pullRequest: pr ? `#${pr.number} ${pr.state}` : null,
    merged,
    verdict,
  }
}

const report = listWorktrees().map(describe)

if (asJson) {
  console.log(JSON.stringify({ repo, defaultBranch, worktrees: report }, null, 2))
} else {
  const rows = report.map((r) => [
    r.name,
    r.branch ?? '(detached)',
    r.lastModified,
    String(r.uncommittedFiles),
    r.unpushedCommits === null ? 'no upstream' : String(r.unpushedCommits),
    r.pullRequest ?? '-',
    r.verdict,
  ])
  const header = ['WORKTREE', 'BRANCH', 'LAST MODIFIED', 'UNCOMMITTED', 'UNPUSHED', 'PR', 'VERDICT']
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)))
  for (const row of [header, ...rows]) console.log(row.map((cell, i) => cell.padEnd(widths[i])).join('  '))
}
