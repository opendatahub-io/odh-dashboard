# Contract Testing Package

This package provides shared utilities and configurations for contract testing across all ODH Dashboard modules.

## Features

- **Shared Utilities**: Common API client, schema validation, and logging utilities
- **Base Configurations**: Reusable Jest and TypeScript configurations
- **Mock BFF Server**: Shared mock backend for testing
- **Schema Validation**: OpenAPI and JSON Schema validation helpers

## Usage

### For Module Developers

1. **Extend Base Configurations**:
   ```js
   // jest.contract.config.js
   const baseConfig = require('../../packages/pact-testing/jest.contract.config.base.js');
   module.exports = {
     ...baseConfig,
     // Add module-specific overrides
   };
   ```

2. **Use Shared Utilities**:
   ```typescript
   import { ContractApiClient, ContractSchemaValidator } from '@odh-dashboard/pact-testing';
   // For API client only:
   import { ContractApiClient } from '@odh-dashboard/pact-testing/api';
   ```

3. **Extend Base Setup**:
   ```typescript
   // setup.ts
   import '../../packages/pact-testing/setup.base';
   // Add module-specific setup
   ```

### Package Structure

```
packages/pact-testing/
├── src/                    # Source code
├── jest.config.base.ts     # Base Jest configuration
├── jest.contract.config.base.js  # Base contract test configuration
├── tsconfig.base.json      # Base TypeScript configuration
├── setup.base.ts           # Base test setup
└── package.base.json       # Base package.json template
```

## Dependencies

- `axios`: HTTP client for API calls
- `ajv`: JSON Schema validation
- `ajv-formats`: Additional JSON Schema formats

## Contributing

When adding new utilities or configurations:

1. Ensure they are generic and reusable across modules
2. Follow the existing patterns and naming conventions
3. Add appropriate tests and documentation
4. Update this README if needed