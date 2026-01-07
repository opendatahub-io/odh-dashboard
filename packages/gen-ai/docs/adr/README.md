# Architectural Decision Records (ADRs)

This directory contains Architectural Decision Records for the Gen AI package.

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
| [0002](./0002-system-architecture.md) | Gen AI System Architecture | 2025-01-25 (Updated: 2025-12-16) |
| [0003](./0003-core-user-flows.md) | Core User Flows | 2025-01-25 (Updated: 2025-12-16) |
| [0004](./0004-logging-strategy-and-observability.md) | Logging Strategy and Observability | 2025-12-16 |
| [0005](./0005-authentication-authorization-architecture.md) | Authentication and Authorization Architecture | 2025-12-16 |
| [0006](./0006-factory-pattern-client-management.md) | Factory Pattern for Client Management | 2025-12-16 |
| [0007](./0007-domain-repository-pattern.md) | Domain Repository Pattern | 2025-12-16 |
| [0008](./0008-caching-strategy.md) | Caching Strategy | 2025-12-16 |
| [0009](./0009-maas-service-autodiscovery.md) | MaaS Service Autodiscovery | 2025-12-16 |
| [0010](./0010-kubernetes-client-architecture.md) | Kubernetes Client Architecture | 2025-12-16 |

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