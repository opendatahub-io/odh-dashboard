# Architectural Decision Records (ADRs)

This directory contains Architectural Decision Records for the Llama Stack Modular UI package.

## What are ADRs?

Architectural Decision Records (ADRs) are lightweight documents that capture important architectural decisions along with their context and consequences. They help teams:
- Remember why decisions were made
- Avoid repeating discussions
- Onboard new team members
- Maintain architectural consistency

## ADR Index

| ADR | Title | Date |
|-----|-------|------|
| [0001](./0001-record-architecture-decisions.md) | Record Architecture Decisions | 2025-01-25 |
| [0002](./0002-system-architecture.md) | Llama Stack Modular UI System Architecture | 2025-01-25 |
| [0003](./0003-core-user-flows.md) | Core User Flows | 2025-01-25 |

## Creating a New ADR

1. Copy the [template](./template.md)
2. Number it sequentially
3. Use kebab-case for the filename
4. Fill in all sections
5. Submit as part of your PR
6. Update this README index

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