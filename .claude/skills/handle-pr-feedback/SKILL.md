---
name: handle-pr-feedback
description: Use when the user asks to address, handle, apply, or respond to review comments or feedback on a pull request, or says that review comments were added to a PR.
---

# Handle PR Feedback

## Overview

Each open review thread gets exactly one outcome. Decide the outcome before you change a file.

| Outcome     | When                                                                                                    | Files     | Thread                                            |
| ----------- | ------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------- |
| **Done**    | The comment tells you what to do: "remove", "rename", "use X", "this should say Y", "X might read better as Y". | Change    | Reply, then resolve                               |
| **Discuss** | The comment asks a question, proposes something to consider ("consider", "should we", "is this right"), or the user said to explore it. | No change | Leave open. Bring to the user.                    |
| **Decline** | The comment tells you what to do, and you have a technical reason not to do it.                         | No change | Reply with the reason. Leave open. Tell the user. |

- Classify a thread by the latest comment of the reviewer. Read the full thread first.
- A soft word such as "might" or "perhaps" on a concrete replacement is Done. A comment with no concrete replacement is Discuss.
- When a comment has two parts with different outcomes, do the instruction part. The reply says what is done and that the thread stays open for the other part.
- Before you decline, use superpowers:receiving-code-review to test your reason.

## Steps

1. **Check the checkout.** The branch is the head branch of the PR, it has no uncommitted changes, and it is level with the remote.
2. **Fetch every thread** with the query below. Read the review bodies and the PR conversation comments too. Skip a thread that a bot started. Your own earlier replies are context, not feedback.
3. **Classify each open thread** with the table. Keep the list for the report: thread, outcome, one line on what you will do. Do not wait for confirmation.
4. **Scan the resolved threads** for a question that nobody answered. Put each one in the report.
5. **Apply the Done items, and carry each one through.** Read the current file at `path`. A thread with `isOutdated` true is on text that changed after the comment. A comment is on one line, but the same wording or idea is usually in other places: other files, other planning artifacts, the PR body. Search for it. For an OpenSpec change, carry the change through proposal, specs, design, and tasks, then validate the change with the OpenSpec command of the repository, with `--strict`.
6. **Commit and push one commit for the round.** Follow the commit rules of the repository. The replies refer to this commit.
7. **Reply to each Done thread, then resolve it.** The reply says what changed and gives the commit. If you did something different from the literal request, say what and why. If you carried the change to other places, name them. Do not put a question in a reply on a thread that you resolve. Put the question in the report.
8. **Compare the PR body with the head commit, in every round.** Correct wording that the branch removed, lists of files, and commit permalinks.
9. **Report to the user**: what is done, what is declined and why, the unanswered questions from step 4, and the Discuss items. For each Discuss item, give the context, the options, and your recommendation.

When a round has no Done item, skip steps 5 to 7.

## Rules

- Resolve a thread only when you changed something for it and replied.
- Do not change a file for a Discuss item before the user decides.
- Do not reply on a Discuss thread when the user is the reviewer. When the reviewer is a different person, ask the user what to reply.
- Do not skip an instruction silently. Do it, or reply with the reason.
- After the user decides a Discuss item, treat it as a Done item: change, commit, reply, resolve.
- The review state, such as "changes requested", stays after the threads are resolved. Tell the user. Do not request a new review yourself.

## Commands

`gh pr view` can fail in a repository that had classic Projects. Use `gh api`. In an environment with a token for each organization, put `GH_ORG=<org>` before each `gh` call.

Fetch the threads, the reviews, and the conversation comments:

```bash
gh api graphql -f query='
query {
  repository(owner: "OWNER", name: "REPO") {
    pullRequest(number: 123) {
      body
      reviewThreads(first: 100) {
        pageInfo { hasNextPage }
        nodes {
          id isResolved isOutdated path line originalLine
          comments(first: 30) {
            pageInfo { hasNextPage }
            nodes { databaseId url createdAt author { login } body }
          }
        }
      }
      reviews(first: 30) { nodes { author { login } state body } }
      comments(first: 50) { pageInfo { hasNextPage } nodes { author { login } body } }
    }
  }
}'
```

- `id` (starts with `PRRT_`) is the thread ID. Use it to resolve the thread.
- `databaseId` of the **first** comment of the thread is the comment ID. Use it to reply. A reply to the ID of a later comment fails.
- `line` is the line in the current file. It is null when the thread is outdated. Then find the text with `originalLine` and a search.
- If a `hasNextPage` is true, fetch the next page. Do not work from a list that is not complete.

Reply to a thread. Write the reply to a file, so that quotes in the text cause no problem:

```bash
gh api --method POST repos/OWNER/REPO/pulls/123/comments/COMMENT_ID/replies -F body=@reply.md
```

Resolve a thread:

```bash
gh api graphql \
  -f query='mutation($id: ID!) { resolveReviewThread(input: { threadId: $id }) { thread { isResolved } } }' \
  -f id=PRRT_xxx
```

Update the PR body:

```bash
gh api --method PATCH repos/OWNER/REPO/pulls/123 -F body=@body.md
```

## Example reply

> Done in ac2be0d2. The line now says "the validation of the structure of a model". I used "structure" and not "syntax", because the validation also covers references between files. The design and the tasks now use "validate" where they used "check".

## Common mistakes

| Mistake                                    | Correction                                                           |
| ------------------------------------------ | -------------------------------------------------------------------- |
| Change only the line that has the comment  | Search the other files and the PR body for the same wording.         |
| Answer a question by changing the file     | A question is a Discuss item. Bring it to the user.                  |
| Resolve a Discuss or Decline thread        | Leave it open. The reviewer resolves it.                             |
| Reply "Done" with no detail                | Say what changed, and give the commit.                               |
| Ask a question in a reply, then resolve    | A resolved thread is not read again. Ask the user in the report.     |
| Reply before the push                      | Push first, so that the commit in the reply exists on the remote.    |
| One commit for each comment                | One commit for the round, unless the repository rules say different. |
| Leave the PR body as it was                | Compare it with the head commit in every round.                      |
