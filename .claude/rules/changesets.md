---
paths:
  - ".changeset/*.md"
  - "**/.changeset/*.md"
---

# Changesets

Rules for writing changeset files.

## One change per changeset

Each distinct change gets its own changeset file. A "change" is one thing a consumer
can observe: one new API, one new behavior, one fix. Each changeset body becomes a
single changelog line item, so if the body needs a semicolon or "also" to hold it
together, it is more than one change — split it.

This applies within a single package too. A new package that ships several notable
APIs gets a "New package: <what it is>" changeset plus one changeset per API. Example:
a new helpers library introducing `setInvulnerable()` and `registerGuard()` is three
changesets — the package, and one per function — not one paragraph describing all
three.

Only include multiple packages in a single changeset when it is literally the same
change applied across packages (e.g. rolling out a shared config update
monorepo-wide).

Example of what to split: "add feature X to library A" and "update app B to use
feature X" are two changes — two changesets — even when they land in the same PR.

## Bump every package a change affects

A changeset is also the version-bump manifest, so include every package the change
touches — not just the one you edited by hand. When a change to a shared package
mechanically affects its consumers (regenerating their managed config, changing
generated output, a dependency's behavior they rely on), bump all of those consumers,
usually at `patch`, in a single "same change across packages" changeset.

That combined consumer bump is separate from the changeset for the shared package's
own change. Example — extracting shared config logic is two changesets:

1. a `minor` on the config package (its new export), and
2. a `patch` across every package whose generated config was regenerated as a result.

Do not list a brand-new package in the consumer patch changeset — its config is part
of its own "new package" changeset.

## Keep it changelog-length

Write 1-2 sentences describing the change from the consumer's perspective. Never
exceed a single short paragraph. No implementation narrative, motivation essays, or
bullet lists of internal details — that belongs in the PR description. The PR is
linked from the change and is the authoritative source for detail, so nothing is
lost by keeping the changeset short.

Omit implementation mechanics a consumer can't observe — module/import style
("imported type-only"), test strategy ("unit-tests with duck-typed objects"), build
wiring, internal refactors that enabled the feature. If a sentence describes how the
code is written rather than what the package now does, cut it.
