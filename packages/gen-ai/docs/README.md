# Gen AI Documentation

This directory contains documentation for the Gen AI package.

## Structure

- `adr/` - Architectural Decision Records (ADRs) documenting key architectural decisions
- `user/` - User and operator documentation (configuration, deployment, operations)
- `developer/` - Developer documentation (testing, development setup, contributing)
- API documentation is maintained in `bff/openapi/` directory

## Documentation Categories

### User Documentation

Documentation for users, operators, and administrators:

- [Logging Configuration](./user/admin/logging/README.md) - Configure and enable logging across gen-ai components

### Developer Documentation

Documentation for developers contributing to the project:

- [Developer Documentation Index](./developer/README.md) - Overview of developer resources
- [BFF Testing Guide](../bff/README.md) - Comprehensive testing guide
- [Architectural Decision Records](./adr/) - Key architectural decisions

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

When making architectural changes to the Gen AI:
1. Consider if an ADR is needed
2. Create an ADR for significant decisions
3. Link to relevant ADRs in PR descriptions 