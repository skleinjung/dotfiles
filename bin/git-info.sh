#!/bin/bash
set -e

# Verify that we're inside a git repository.
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Error: Not inside a Git repository."
  exit 1
fi

# Check for uncommitted changes.
if [[ -n $(git status --porcelain) ]]; then
  echo "❌ Error: Local working copy has uncommitted changes. Please commit or stash them first."
  exit 1
fi

# Get the repository name (from the top-level directory).
repo_name=$(basename "$(git rev-parse --show-toplevel)")

# Get the full remote URL (assuming "origin").
remote_url=$(git config --get remote.origin.url)

# Get the current commit's short SHA.
commit_short=$(git rev-parse --short HEAD)

# Get the active branch name.
branch=$(git rev-parse --abbrev-ref HEAD)

# Output all details on a single line for audit logs.
echo "Repository: $repo_name | Remote: $remote_url | Branch: $branch | SHA: $commit_short"
