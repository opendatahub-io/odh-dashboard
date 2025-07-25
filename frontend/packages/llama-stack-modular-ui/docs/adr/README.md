# Architectural Decision Records (ADRs)

This directory contains Architectural Decision Records for the Llama Stack Modular UI package.

## What are ADRs?

Architectural Decision Records (ADRs) are lightweight documents that capture important architectural decisions along with their context and consequences. They help teams:
- Remember why decisions were made
- Avoid repeating discussions
- Onboard new team members
- Maintain architectural consistency

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|---------|------|
| [0001](./0001-record-architecture-decisions.md) | Record Architecture Decisions | ACCEPTED | 2025-01-25 |

## Creating a New ADR

1. Copy the [template](./template.md)
2. Number it sequentially (next would be `0002`)
3. Use kebab-case for the filename
4. Fill in all sections
5. Submit as part of your PR
6. Update this README index

## ADR Lifecycle

```
PROPOSED → ACCEPTED → [DEPRECATED/SUPERSEDED]
```

- **PROPOSED**: Under discussion, not yet implemented
- **ACCEPTED**: Decision made and being/has been implemented  
- **DEPRECATED**: No longer valid, but not replaced
- **SUPERSEDED**: Replaced by a newer ADR (link to the superseding ADR)

## Guidelines

### When to Create an ADR

Create an ADR for decisions that:
- Are significant and have long-term impact
- Affect system architecture or design patterns
- Choose between multiple viable alternatives
- Involve trade-offs that need explanation
- Set standards or conventions for the project

### When NOT to Create an ADR

Don't create ADRs for:
- Simple implementation choices
- Temporary workarounds
- Decisions that are easily reversible
- Obvious choices with no alternatives

## Links

- [ADR website](https://adr.github.io/) - More information about ADRs
- [Template](./template.md) - Template for new ADRs 