---
name: writing-pull-requests
description: Use when writing or updating a pull request title or body, including PRs opened at the end of an OpenSpec change or by superpowers:finishing-a-development-branch.
---

# Writing Pull Requests

## Title

- Prefix the title with a Conventional Commits type (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`), with a scope when one fits (e.g. `feat(grinbox): ...`). The title becomes the squash-merge commit message.
- After the prefix, describe the effect or intent of the change, not how it was implemented: `fix(lock-link): keep access codes in sync when a reservation moves`, not `fix(lock-link): update sync loop to re-query dates`.

## Body

- Use the repository's `.github/pull_request_template.md`, keeping its sections in order.
- Replace every HTML comment in the template with content. Delete the comment itself, and delete any section marked "omit if none" that has nothing to say. Never leave empty headings or template comments in the body.
- Write each paragraph and each list item on one source line. GitHub renders single newlines in PR bodies as line breaks, so hard-wrapped text renders ragged. Use newlines only for Markdown structure (between paragraphs, list items, headings, and tables).

## Metadata table

The body starts with the template's metadata table: a headerless, two-column HTML table. Use HTML inside its cells, never Markdown, because Markdown inside HTML table cells does not render.

```html
<table>
  <tr>
    <td><strong>Issue</strong></td>
    <td><a href="https://github.com/twin-digital/opus/issues/123">Issue title</a></td>
  </tr>
  <tr>
    <td><strong>OpenSpec</strong></td>
    <td>
      <a href="https://github.com/twin-digital/opus/tree/0a1b2c3/openspec/changes/archive/2026-11-22-add-csv-export">add-csv-export</a>
    </td>
  </tr>
</table>
```

- **Issue:** a link to the primary GitHub issue for this work, with the issue's title as the anchor text.
- **OpenSpec:** a link to the change's folder in this repository, with the change ID as the anchor text. If the change has been archived (the normal case, since the workflow archives it before opening the PR), link `openspec/changes/archive/YYYY-MM-DD-<change-id>/`; otherwise link `openspec/changes/<change-id>/`. Use a commit permalink (`/tree/<commit-sha>/...`, from the PR branch's latest commit that touched the change folder) so the link survives branch deletion and squash merge. If the change's documents are revised after the PR is opened, update the permalink.
- If either value does not exist, write `Not Applicable` in its cell. Always include both rows.

## Sections

- **Summary:** one or two paragraphs on why the change exists and what it does, readable without opening anything else. For an OpenSpec change, draw it from `proposal.md` (Why and What Changes) rather than re-describing the change; do not introduce claims the proposal doesn't support.
- **Changes:** the key changes as a list, grouped by package or area when the PR touches several. Omit it when there is only one change and the Summary already describes it.
- **Verification:** only verification a reviewer cannot see from CI or from the tests in this PR's diff: manual testing (what was exercised, how, and the result), checks against a preview stage or deployed environment, and checks against real external services, hardware, or data that tests mock. Do not list CI checks, the test suites CI runs, or tests the PR adds, since the reviewer already sees those. If something that matters could not be verified at all, say so here and why. Omit the section if nothing beyond CI and the PR's tests was verified.
- **Notes:** what a reviewer needs that the diff doesn't show: decisions and their trade-offs, risks, areas deserving the closest look, follow-up required at deploy time. Omit if none.
- **Future Scope:** out-of-scope work planned for later PRs, as links to GitHub issues where they exist. Omit if none.
- **References:** related PRs, issues, CVEs, or external sources that help explain the change. Omit if none.




