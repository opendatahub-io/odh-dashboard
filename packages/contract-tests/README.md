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
  - With shared bin wrapper (starts mock BFF via consumer scripts or direct Jest):
  - `npx odh-contract-tests -c frontend/packages/model-registry/contract-tests`
  - Watch mode: `npx odh-contract-tests -c frontend/packages/model-registry/contract-tests -w`

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

### Using the toMatchContract matcher

- Validate a plain object against a full schema:
  ```ts
  expect(payload).toMatchContract(mySchema);
  ```

- Validate an HTTP response (status + headers + sub-schema via $ref):
  ```ts
  expect(response).toMatchContract(mySchema, {
    ref: '#/definitions/ModelRegistryResponse',
    expectedStatus: 200,
    expectedHeaders: { 'content-type': /json/ },
  });
  ```

Notes:
- Schemas with `$schema: https://json-schema.org/draft/2020-12/schema` are supported (AJV 2020).
- Internal `$ref`s are resolved by registering the entire schema and validating by `$ref`.

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

## Adopt in a new consumer package (checklist)

1. Create `contract-tests/` inside your package with:
   - `jest.contract.config.js` extending `packages/contract-tests/jest.contract.config.base.js`
   - Optional `jest.setup.ts` if you need consumer-specific setup
   - Your schemas and `*.contract.test.ts` specs
2. Map the shared utilities in `moduleNameMapper` (see model-registry example)
3. Add package scripts:
   - `"test:contract": "jest --config contract-tests/jest.contract.config.js"`
   - Optional: `"test:contract:with-bff": "odh-contract-tests -c contract-tests"`
4. Run: `npx odh-contract-tests -c <your-package>/contract-tests`
5. CI: call the same bin in a workflow step; artifacts live under `contract-tests/contract-test-results/<timestamp>`

## CLI usage

```
odh-contract-tests [options]

Options:
  -c, --consumer-dir <path>   Consumer contract-tests directory (default: CWD)
  -j, --jest-config <path>    Path to consumer jest.contract.config.js (optional)
  -r, --results-dir <path>    Directory to write results (default: <consumer>/contract-test-results/<ts>)
  -n, --package-name <name>   Package name for report metadata (default: consumer dir name)
  -w, --watch                 Run in watch mode
  -h, --help                  Show help
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

- If TypeScript in a consumer doesn’t see the matcher type, include typings in its `tsconfig.json`:
  ```json
  {
    "include": [
      "**/*.ts",
      "**/*.tsx",
      "**/*.d.ts",
      "../../../../packages/jest-config/typings.d.ts"
    ]
  }
  ```