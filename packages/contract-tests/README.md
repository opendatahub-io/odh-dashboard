# Contract tests (shared utilities)

Shared utilities and base configuration for consumer-driven contract tests across ODH Dashboard packages.

## Features

- **Shared Utilities**: Common API client, schema validation, and logging utilities
- **Base Configurations**: Reusable Jest and TypeScript configurations
- **Mock BFF Server**: Shared mock backend for testing
- **Schema Validation**: OpenAPI and JSON Schema validation helpers

## How to run locally

- From the repo root, install dependencies:
  - `npm install --ignore-scripts`
- Run contract tests for a specific consumer package (example: Model Registry):
  - `npm -w frontend/packages/model-registry run test:contract`
  - To watch: `npm -w frontend/packages/model-registry run test:contract:watch`
  - With mock BFF wrapper script (starts the mock BFF, runs tests, then shuts down):
  - `npm -w frontend/packages/model-registry run test:contract:with-bff`

Run the shared package tests in this workspace (mostly for library changes here):
- `npm -w packages/contract-tests run test`

Notes:
- Node 20+ is required. See the repo’s root `package.json` engines.
- Contract tests are isolated from UI unit tests and use a Node test environment.

## Usage in a consumer package

### For Module Developers

1. Extend base configuration
   ```
   // jest.contract.config.js
   const baseConfig = require('../../../../packages/contract-tests/jest.contract.config.base.js');

   module.exports = {
     ...baseConfig,
     // Add consumer-specific overrides
   };
   ```

2. Use shared utilities
   ```
   import { ContractApiClient, ContractSchemaValidator } from '@odh-dashboard/contract-testing';
   // If you only need the API client:
   import { ContractApiClient as Client } from '@odh-dashboard/contract-testing/api';
   ```

3. Extend test setup
   ```
   // setup.ts
   import '../../../packages/contract-tests/setup.base';
   // Add consumer-specific setup
   ```

### Package structure

```
packages/contract-testing/
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

When changing code in `packages/contract-tests`:

1. Keep helpers generic and reusable. Avoid consumer-specific logic.
2. Add tests under `src/__tests__` to cover new utilities and edge cases.
3. Run local checks from the repo root:
   - Lint: `npm -w packages/contract-tests run lint`
   - Type-check: `npm -w packages/contract-tests run type-check` (if applicable)
   - Tests: `npm -w packages/contract-tests run test`
4. If you alter the base Jest or TS configs used by consumers, verify at least one real consumer (e.g., Model Registry):
   - `npm -w frontend/packages/model-registry run test:contract`
5. Update this README when interfaces or setup steps change.

## Troubleshooting

- AbortController type errors during contract tests (TS2552):
  - Ensure the consumer package’s contract-tests `tsconfig.json` includes DOM libs, e.g.
  ```json
  {
    "compilerOptions": {
      "lib": ["ES2020", "DOM"]
    }
  }
  ```