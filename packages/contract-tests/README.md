# ODH Dashboard Contract Testing

Consumer contract testing for ODH Dashboard packages. These tests validate that
your frontend (consumer) and the Mock BFF (provider substitute) agree on the
API contract by checking real HTTP responses against OpenAPI/JSON Schemas.

## Quick Start

Run contract tests with one command:

```bash
# From any package directory (preferred via workspace)
npm run test:contract

# Add this script to your package.json
# "test:contract": "npm exec -w @odh-dashboard/contract-tests odh-ct-bff-consumer -- --bff-dir $(pwd)/upstream/bff --consumer-dir $(pwd)/contract-tests --package-name <module>"
```

## What You Get

- ✅ **Zero configuration** - Works out of the box
- ✅ **Jest preset** - Consistent test configuration across all packages
- ✅ **Test utilities** - API client, schema validation, health checks
- ✅ **Schema validation** - OpenAPI/JSON Schema validation for API contracts
- ✅ **Schema conversion** - Convert OpenAPI/Swagger to JSON Schema

## Directory Structure

Your package should have this structure:

```
your-package/
├── contract-tests/           # Your contract tests
│   └── __tests__/
│       └── api.test.ts      # Your test files
└── upstream/
    └── bff/                 # Mock BFF backend
        ├── Makefile         # build and run targets
        ├── go.mod           # Go module
        └── cmd/bff-mock/    # BFF server code
```

## Package.json Setup

Add to your package.json:

```json
{
  "devDependencies": {
    "@odh-dashboard/contract-tests": "workspace:*"
  },
  "scripts": {
    "test:contract": "npm exec -w @odh-dashboard/contract-tests odh-ct-bff-consumer -- --bff-dir $(pwd)/upstream/bff --consumer-dir $(pwd)/contract-tests --package-name <module>",
    "test:contract:watch": "npm run test:contract"
  }
}
```

## TypeScript Configuration

**Zero-Config Setup (Recommended)**

No TypeScript configuration needed! Jest and contract-testing types are automatically available when you import `@odh-dashboard/contract-tests`.

```json
{
  "extends": "@odh-dashboard/tsconfig/tsconfig.json",
  "exclude": ["node_modules", "upstream"]
}
```

**Manual Configuration (Optional)**

If you need to customize your TypeScript setup:

```json
{
  "extends": "@odh-dashboard/tsconfig/tsconfig.json",
  "exclude": ["node_modules", "upstream"],
  "compilerOptions": {
    "types": ["jest"]
  }
}
```

**What's automatically provided:**
- ✅ Jest types for testing (`describe`, `it`, `expect`)
- ✅ Contract-tests types for matchers (`toMatchContract`)
- ✅ Standard ODH TypeScript configuration

## BFF Lifecycle Management

The contract test runner automatically manages your Mock BFF lifecycle:

1. **Builds** your BFF using `go build -o bff-mock ./cmd`
2. **Starts** your BFF server in mock mode with `--mock-k8s-client --mock-mr-client --port 8080`
3. **Waits** for BFF to be healthy (checks `/healthcheck` endpoint)
4. **Runs** your contract tests using the shared Jest harness
5. **Cleans up** BFF process when tests complete

Your BFF must have a `cmd/` directory with a main.go file that accepts these flags:

```go
flag.BoolVar(&cfg.MockK8Client, "mock-k8s-client", false, "Use mock Kubernetes client")
flag.BoolVar(&cfg.MockMRClient, "mock-mr-client", false, "Use mock Model Registry client")
flag.IntVar(&cfg.Port, "port", 8080, "API server port")
```

**Note**: The BFF must expose a `/healthcheck` endpoint for the runner to detect when it's ready.

## Writing Tests

Create test files in `contract-tests/__tests__/`:

```javascript
/* eslint-disable import/no-extraneous-dependencies, import/newline-after-import */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { ContractApiClient } = require('@odh-dashboard/contract-tests');

describe('Your API Contract Tests', () => {
  const api = new ContractApiClient({ baseUrl: 'http://localhost:8080' });

  // Option A: Use checked-in OpenAPI directly
  const oasPath = path.resolve(process.cwd(), 'upstream/api/openapi/openapi.yaml');
  const openApiDoc = yaml.load(fs.readFileSync(oasPath, 'utf8'));

  it('validates response against OpenAPI', async () => {
    const res = await api.get('/api/v1/resources', 'list');
    expect({ status: res.status, data: res.data }).toMatchContract(openApiDoc, {
      ref: '#/components/responses/ListResponse/content/application/json/schema',
      expectedStatus: 200,
    });
  });
});
```

## Schema Options (choose one)

### Option 1: Use checked-in OpenAPI (recommended)
```javascript
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
// eslint-disable-next-line import/no-extraneous-dependencies
const { ContractApiClient } = require('@odh-dashboard/contract-tests');

const api = new ContractApiClient({ baseUrl: 'http://localhost:8080' });
const oasPath = path.resolve(process.cwd(), 'upstream/api/openapi/openapi.yaml');
const openApiDoc = yaml.load(fs.readFileSync(oasPath, 'utf8')) || {};

it('validates response with OpenAPI ref', async () => {
  const res = await api.get('/api/v1/resources', 'list');
  expect({ status: res.status, data: res.data }).toMatchContract(openApiDoc, {
    ref: '#/components/responses/ListResponse/content/application/json/schema',
    expectedStatus: 200,
  });
});
```

### Option 2: Convert OpenAPI → JSON Schema (helpers)
```javascript
// eslint-disable-next-line import/no-extraneous-dependencies
const { createTestSchema, extractSchemaFromOpenApiResponse } = require('@odh-dashboard/contract-tests');

const listResp = ((openApiDoc && openApiDoc.components && openApiDoc.components.responses) || {}).ListResponse;
const extracted = extractSchemaFromOpenApiResponse({
  200: { content: { 'application/json': { schema: listResp } } },
});
const testSchema = createTestSchema({
  200: { content: { 'application/json': { schema: extracted } } },
}, 'ListResponse');

expect({ status: res.status, data: res.data }).toMatchContract(testSchema.schema, { expectedStatus: 200 });
```

### Option 3: Fetch Swagger/OpenAPI at runtime
```javascript
const axios = require('axios');

const openApiUrl = process.env.OPENAPI_URL || '';
const { data: liveOpenApi } = await axios.get(openApiUrl);
expect({ status: res.status, data: res.data }).toMatchContract(liveOpenApi, {
  ref: '#/components/responses/ListResponse/content/application/json/schema',
  expectedStatus: 200,
});
```

## Mock BFF Requirements

Contract tests require a Mock BFF that can be built and run. Your BFF must have a Makefile with these targets:

```makefile
.PHONY: build run clean

build:
	go build -o bff-mock ./cmd/bff-mock

run:
	./bff-mock

clean:
	rm -f bff-mock
```

## Schema Conversion

The contract testing package provides utilities to help convert OpenAPI/Swagger schemas to JSON Schema for validation.

### Using Schema Conversion Utilities

```typescript
import {
  ContractSchemaValidator,
  createTestSchema,
  extractSchemaFromOpenApiResponse,
} from '@odh-dashboard/contract-tests';

describe('API Contract Tests', () => {
  let schemaValidator: ContractSchemaValidator;

  beforeAll(() => {
    schemaValidator = new ContractSchemaValidator();

    // Example OpenAPI response structure from your API docs
    const healthOpenApiResponse = {
      '200': {
        description: 'Health check response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                timestamp: { type: 'string', format: 'date-time' },
              },
              required: ['status'],
            },
          },
        },
      },
    };

    // Convert OpenAPI schema to testable JSON Schema
    const healthSchema = createTestSchema(healthOpenApiResponse, 'HealthResponse');
    if (healthSchema) {
      schemaValidator.loadSchema(healthSchema.name, healthSchema.schema);
    }
  });

  it('should validate health response schema', () => {
    const mockResponse = {
      status: 'healthy',
      timestamp: '2025-08-29T11:00:00Z',
    };

    const validation = schemaValidator.validateResponse(mockResponse, 'HealthResponse');
    expect(validation.valid).toBe(true);
  });
});
```

### Manual Schema Creation

For simple cases, you can also create schemas manually:

```typescript
const simpleSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
  },
  required: ['id', 'name'],
};

schemaValidator.loadSchema('SimpleResponse', simpleSchema);
```

### Available Schema Conversion Functions

- `createTestSchema(openApiResponse, schemaName, statusCode?)` - Convert OpenAPI response to testable schema
- `extractSchemaFromOpenApiResponse(openApiResponse, statusCode?, contentType?)` - Extract schema from OpenAPI response
- `convertOpenApiToJsonSchema(openApiSchema)` - Convert OpenAPI schema to JSON Schema

## Available Commands

```bash
# Basic usage
npm run test:contract

# Watch mode
npm run test:contract:watch

# Direct Jest usage
jest --config=../../contract-tests/jest.preset.js --testPathPattern=contract-tests
```

## Zero Configuration Required

**package.json (Required):**
```json
{
  "devDependencies": {
    "@odh-dashboard/contract-tests": "workspace:*"
  },
  "scripts": {
    "test:contract": "npm exec -w @odh-dashboard/contract-tests odh-ct-bff-consumer -- --bff-dir $(pwd)/upstream/bff --consumer-dir $(pwd)/contract-tests --package-name <module>"
  }
}
```

**tsconfig.json (Optional - uses defaults):**
```json
{
  "extends": "@odh-dashboard/tsconfig/tsconfig.json",
  "exclude": ["node_modules", "upstream"]
}
```

**Everything is handled automatically:**
- ✅ Jest configuration and types
- ✅ Contract-tests matcher types
- ✅ BFF lifecycle management
- ✅ Schema validation setup
- ✅ Test result reporting
- ✅ TypeScript type definitions

## What Happens Under the Hood

1. **Jest preset** - Uses shared configuration for consistent testing
2. **Test execution** - Runs tests with optimized Jest configuration
3. **Schema validation** - Validates API responses against your schemas
4. **Reports** - Generates standard Jest reports and coverage

## Schema Validation

The main point of contract testing is to validate API responses against schemas. You have three options:

### Option 1: Inline JSON Schema (Simple)
```typescript
const schema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    status: { type: 'string', enum: ['active', 'inactive'] }
  },
  required: ['id', 'name', 'status']
};

expect({ status: result.status, data: result.data }).toMatchContract(schema, {
  expectedStatus: 200,
});
```

### Option 2: OpenAPI Reference (Recommended)
```typescript
// Load OpenAPI spec from upstream
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const openApiPath = path.resolve(process.cwd(), 'upstream/api/openapi/spec.yaml');
const openApiDoc = yaml.load(fs.readFileSync(openApiPath, 'utf8'));

expect({ status: result.status, data: result.data }).toMatchContract(openApiDoc, {
  ref: '#/components/responses/ModelRegistryResponse/content/application/json/schema',
  expectedStatus: 200,
});
```

### Option 3: Custom Schema Loader (Advanced)
```typescript
import { SchemaValidator } from '@odh-dashboard/contract-tests';

const schemaValidator = new SchemaValidator();
schemaValidator.loadSchema('UserResponse', schema);

// Validate API response
const result = await apiClient.get('/api/v1/users/123', 'Get User');
const validation = schemaValidator.validateResponse(result.data, 'UserResponse');

expect(validation.valid).toBe(true);
```

## Troubleshooting

If something goes wrong:

1. Make sure you have a `contract-tests/` directory
2. Make sure you have an `upstream/bff/` directory with a Makefile
3. Check that your BFF builds with `make build`
4. Check that your BFF runs with `make run`

## Examples

See the `packages/model-registry/contract-tests/` directory for working examples.

## Available Utilities

- **`ContractApiClient`** - HTTP client for API testing
- **`ContractSchemaValidator`** - JSON Schema validation
- **`verifyBffHealth`** - BFF health checks
- **`logTestSetup`** - Test logging utilities
- **`validateContract`** - Contract validation helpers
- **`createTestSchema`** - Convert OpenAPI to JSON Schema
- **`extractSchemaFromOpenApiResponse`** - Extract schemas from OpenAPI responses