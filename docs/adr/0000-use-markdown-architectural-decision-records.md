# 0. Use Markdown Architectural Decision Records

Date: 2026-03-11

## Status

Accepted

## Context

We need to record the architectural decisions made on this project so that:
- New team members can understand why certain choices were made
- AI agents can access architectural context when making changes
- We can revisit decisions with full context when requirements change

## Decision

We will use Architecture Decision Records (ADRs) as described by Michael Nygard in his article [Documenting Architecture Decisions](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions).

ADRs will be:
- Written in Markdown format
- Stored in `docs/adr/`
- Numbered sequentially (0000, 0001, 0002, etc.)
- Named in format: `NNNN-title-with-dashes.md`

Each ADR will contain:
- **Title**: Numbered and descriptive
- **Date**: When the decision was made
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: Forces at play, including technical, political, social, and project local
- **Decision**: Response to these forces
- **Consequences**: Resulting context, including positive, negative, and neutral effects

## Consequences

**Positive:**
- Architectural decisions are explicitly documented
- Historical context is preserved
- AI agents can understand "why" not just "what"
- Easier onboarding for new team members
- Decisions can be revisited with full context

**Negative:**
- Requires discipline to document decisions
- Takes time to write ADRs

**Neutral:**
- ADRs are immutable once accepted (new ADRs supersede old ones)
- ADRs complement but don't replace other documentation

## References

- [Michael Nygard's article](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub organization](https://adr.github.io/)
- [MADR template](https://adr.github.io/madr/)
