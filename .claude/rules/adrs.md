---
description: ODH Dashboard architecture decision record format, review, and supersession rules
globs: "docs/adr/**"
alwaysApply: false
paths:
  - "docs/adr/**"
---

# Architecture Decision Records

Use [the ADR template](../../docs/adr/template.md) for new records in
`docs/adr/`. ADRs 0000–0004 are legacy records; preserve their existing format.

- Record one decision per ADR. For new ADRs, include `title`, `status`, and
  `topics` frontmatter, the date, and the Status, Context, Decision, and
  Consequences sections. Include Options only when alternatives are useful.
- Use `Proposed`, `Accepted`, `Deprecated`, or `Superseded` for status. For new
  ADRs, keep frontmatter and `## Status` consistent. Legacy ADRs 0000–0004
  retain their format and have status annotated in `## Status`.
- After acceptance, do not edit Context, Decision, or Consequences. Typos,
  broken links, formatting, short clarifications, cross-references, and status
  changes are permitted outside those sections when they do not change the
  recorded decision.
- To change an accepted decision, create a new ADR. Link the previous ADR from
  the new one, mark the previous ADR `Superseded`, and add a link to the new ADR
  from the previous one. For legacy ADRs without frontmatter, update only the
  `## Status` section and add the cross-reference outside the original sections.
- Reviewers should reject substantial rewrites of accepted ADRs and request a
  superseding ADR instead. Check related architecture docs for the current view.

Follow [the writing workflow](../skills/writing-adrs/SKILL.md) when drafting or
reviewing an ADR.
