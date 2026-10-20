---
name: writing-adrs
description: Use when proposing, writing, reviewing, or superseding an architecture decision record in this repository.
---

# Writing ADRs

## Purpose

Record one architectural decision and the context in which it was made. ADRs are
point-in-time records; [architecture-decisions.md](../../../docs/architecture-decisions.md)
summarizes current decisions. ADRs 0000–0004 predate the template and do not need
frontmatter added retroactively.

## Prerequisites

- Read [the ADR rule](../../rules/adrs.md) and
  [the template](../../../docs/adr/template.md).
- Read related ADRs in `docs/adr/` and the relevant current architecture docs.

## Inputs

- The decision, its rationale, and its practical consequences.
- Relevant design discussions, issue links, and related ADRs, when available.

## Workflow

1. **Choose a number.** Check existing `docs/adr/NNNN-*.md` files and open PRs
   for conflicting numbers. Use the next available four-digit number in the
   filename, `NNNN-short-title.md`; use the unpadded number in the title and
   heading.
2. **Copy the template.** Fill in `title`, `status`, and `topics` frontmatter,
   the date, and the body. Keep frontmatter status and `## Status` in sync.
   New proposals start as `Proposed`; use `Accepted` once the decision is made.
3. **Write one decision.** Keep Context to a few short paragraphs, Decision
   direct, and Consequences concise. Link to existing docs instead of repeating
   long background. Keep Options only when real alternatives explain the choice.
4. **Link related decisions.** Cite related ADRs in Context. When a new ADR
   replaces an accepted decision, link the old ADR from the new one, set the
   old status to `Superseded`, and add a link from the old ADR to the new one.
   For legacy ADRs without frontmatter, update their `## Status` section only.
5. **Update current documentation.** Once accepted, make focused updates to
   `docs/architecture-decisions.md` and any directly affected architecture
   docs so they describe the current decision and link to its ADR.
6. **Review the record.** Confirm the number is unique, links resolve, status
   matches in both places, and the ADR covers one decision. Reviewers should
   reject substantial rewrites of an accepted ADR's Context, Decision, or
   Consequences; use a superseding ADR instead.

Accepted ADRs may receive typo fixes, repaired links, short clarifications,
cross-references, and status changes outside Context, Decision, and
Consequences. Preserve those three sections as written when accepted.
