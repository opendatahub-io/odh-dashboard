# Llama Stack Modular UI Documentation

This directory contains documentation for the Llama Stack Modular UI package.

## Structure

- `adr/` - Architectural Decision Records (ADRs) documenting key architectural decisions
- API documentation is maintained in `bff/openapi/` directory

## Architectural Decision Records (ADRs)

ADRs document the architectural decisions made for this project. Each ADR captures:
- The context and problem being solved
- The decision made
- The consequences of that decision

### Creating a New ADR

1. Copy the template from `adr/template.md`
2. Number it sequentially (e.g., `0002-your-decision.md`)
3. Fill in the sections
4. Submit as part of your PR

### ADR Status

- **Proposed** - Under discussion
- **Accepted** - Decision made and being implemented
- **Deprecated** - No longer valid, superseded by another ADR
- **Superseded** - Replaced by a newer ADR

## Contributing

When making architectural changes to the Llama Stack Modular UI:
1. Consider if an ADR is needed
2. Create an ADR for significant decisions
3. Link to relevant ADRs in PR descriptions 