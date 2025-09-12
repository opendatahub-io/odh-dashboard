# ODH Dashboard Contract Testing

Consumer contract testing for ODH Dashboard packages. These tests validate that
your frontend (consumer) and the Mock BFF (provider substitute) agree on the
API contract by checking real HTTP responses against OpenAPI/JSON Schemas.

## Getting Started

### 1. Add to your package.json

```json
{
  "devDependencies": {
    "@odh-dashboard/contract-tests": "*"
  },
  "scripts": {
    "test:contract": "odh-ct-bff-consumer --bff-dir upstream/bff"
  }
}
```

### 2. Ensure your tsconfig.json extends the base config

```json
{
  "extends": "@odh-dashboard/tsconfig/tsconfig.json",
  "exclude": ["node_modules", "upstream"]
}
```

### 3. Run your first test

```bash
npm run test:contract
```

That's it! The framework handles everything automatically.

## Quick Start

### Option 1: All-in-one Script (Recommended for CI)
Run contract tests with one command:

```bash
# From any package directory (preferred via workspace)
npm run test:contract

# With HTML reports (opens browser automatically)
npm run test:contract -- --open

# With BFF building (for performance in CI)
npm run test:contract -- --build-bff

# Combine options
npm run test:contract -- --open --build-bff

# Add this script to your package.json
# "test:contract": "odh-ct-bff-consumer --bff-dir upstream/bff"
```

### Option 2: Manual Setup (For Advanced Development)
For debugging or custom workflows, you can run components separately:

```bash
# Terminal 1: Start the Mock BFF manually
cd packages/your-package/upstream/bff
go run ./cmd --mock-k8s-client --mock-mr-client --port 8080 --allowed-origins="*"

# Terminal 2: Run contract tests (auto-detects BFF URL)
cd packages/your-package
npm run test:contract

# Or run with custom BFF URL and report opening
CONTRACT_MOCK_BFF_URL=http://localhost:8080 npm run test:contract -- --open
```

### Option 3: Turbo Orchestration (CI Optimized)
Use Turbo for intelligent test execution across multiple packages:

```bash
# Run contract tests for all packages with contract tests
npx turbo run test:contract

# Run for specific package
npx turbo run test:contract --filter=@odh-dashboard/model-registry

# Or use npm run (from root package.json)
npm run test:contract -- --open

# Run with automatic report opening (opens browser for each package)
npx turbo run test:contract -- --open

# Combine with package filtering
npx turbo run test:contract --filter=@odh-dashboard/model-registry -- --open

```

## What You Get

- ✅ **Zero configuration** - Works out of the box
- ✅ **Jest preset** - Consistent test configuration across all packages
- ✅ **Test utilities** - API client, schema validation, health checks
- ✅ **Schema validation** - OpenAPI/JSON Schema validation for API contracts
- ✅ **Schema conversion** - Convert OpenAPI/Swagger to JSON Schema
- ✅ **Performance optimization** - Use `--build-bff` for faster CI builds
- ✅ **Flexible reporting** - Use `--open` to automatically open HTML reports

## Directory Structure

Your package should have this structure:

```
your-package/
├── contract-tests/           # Your contract tests
│   ├── __tests__/
│   │   └── api.test.ts      # Your test files
│   ├── jest.config.js       # Jest configuration
│   └── jest.setup.js        # Jest setup file
└── upstream/
    └── bff/                 # Mock BFF backend
        ├── Makefile         # build and run targets
        ├── go.mod           # Go module
        └── cmd/             # BFF server code (main.go, etc.)
```

## TypeScript Configuration

**Configuration**

Your TypeScript configuration should extend the base ODH config:

```json
{
  "extends": "@odh-dashboard/tsconfig/tsconfig.json",
  "exclude": ["node_modules", "upstream"]
}
```

**What's automatically provided:**
- ✅ Jest types for testing (`describe`, `it`, `expect`)
- ✅ Contract-tests types for matchers (`toMatchContract`)
- ✅ Standard ODH TypeScript configuration

## Jest Configuration

### jest.config.js (Required)

Each package needs a `jest.config.js` file in the `contract-tests/` directory:

```javascript
const path = require('path');

module.exports = {
  preset: '../../../packages/contract-tests/jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ['node_modules', path.resolve(__dirname, '../../../node_modules')],
};
```

**Configuration breakdown:**
- **`preset`** - Uses the shared contract-testing Jest configuration
- **`setupFilesAfterEnv`** - Loads the setup file after the test environment is ready
- **`moduleDirectories`** - Tells Jest where to find modules (handles monorepo structure)

### jest.setup.js (Required)

A setup file that initializes the contract testing framework:

```javascript
// Jest setup file for contract tests
// This ensures Jest types are loaded properly for contract testing

// Import the contract test setup to initialize Jest matchers
// Replace with: require('@odh-dashboard/contract-tests');
// (After adding @odh-dashboard/contract-tests to your devDependencies)
```

**Purpose:**
- Loads the contract testing framework
- Initializes custom Jest matchers (like `toMatchContract`)
- Ensures proper Jest environment for contract tests

### Why These Files Are Required

Without proper Jest configuration, contract tests will fail because:

1. **TypeScript Support** - The preset provides TypeScript compilation
2. **Custom Matchers** - `jest.setup.js` loads the `toMatchContract` matcher
3. **Module Resolution** - Handles the complex monorepo module structure
4. **Test Environment** - Configures the proper Node.js test environment

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

```typescript
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Your API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
  const api = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  // Load OpenAPI schema (recommended approach)
  const apiSchema = loadOpenAPISchema('upstream/api/openapi/spec.yaml');

  it('validates response against OpenAPI', async () => {
    const result = await api.get('/api/v1/resources');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/ListResponse/content/application/json/schema',
      status: 200,
    });
  });
});
```

## Schema Options (choose one)

### Option 1: Use checked-in OpenAPI (recommended)
```typescript
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8080';
const api = new ContractApiClient({
  baseUrl,
  defaultHeaders: {
    'kubeflow-userid': 'dev-user@example.com',
    'kubeflow-groups': 'system:masters',
  },
});

// Load OpenAPI schema using helper function
const apiSchema = loadOpenAPISchema('upstream/api/openapi/spec.yaml');

it('validates response with OpenAPI ref', async () => {
  const result = await api.get('/api/v1/resources');
  expect(result).toMatchContract(apiSchema, {
    ref: '#/components/responses/ListResponse/content/application/json/schema',
    status: 200,
  });
});
```

### Option 2: Convert OpenAPI → JSON Schema (helpers)
```typescript
import { createTestSchema, extractSchemaFromOpenApiResponse } from '@odh-dashboard/contract-tests';

// Load OpenAPI document first
const apiSchema = loadOpenAPISchema('upstream/api/openapi/spec.yaml');
const listResp = apiSchema.components?.responses?.ListResponse;

// Extract and convert schema
const extracted = extractSchemaFromOpenApiResponse({
  200: { content: { 'application/json': { schema: listResp } } },
});
const testSchema = createTestSchema({
  200: { content: { 'application/json': { schema: extracted } } },
}, 'ListResponse');

expect(result).toMatchContract(testSchema?.schema, { status: 200 });
```

### Option 3: Fetch Swagger/OpenAPI at runtime
```typescript
import axios from 'axios';

const openApiUrl = process.env.OPENAPI_URL || '';
const { data: liveOpenApi } = await axios.get(openApiUrl);
expect(result).toMatchContract(liveOpenApi, {
  ref: '#/components/responses/ListResponse/content/application/json/schema',
  status: 200,
});
```

## Mock BFF Requirements

Contract tests require a Mock BFF that can be built and run. Your BFF must have a Makefile with these targets:

```makefile
.PHONY: build run clean

build:
	go build -o bff-mock ./cmd

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
      timestamp: new Date().toISOString(),
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

# Direct Jest usage (from package root)
npx jest --config=contract-tests/jest.config.js --testPathPattern=contract-tests
```

## Zero Configuration Required

**package.json (Required):**
```json
{
  "devDependencies": {
    "@odh-dashboard/contract-tests": "workspace:*"
  },
  "scripts": {
    "test:contract": "odh-ct-bff-consumer --bff-dir upstream/bff"
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

expect(result).toMatchContract(schema, {
  status: 200,
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

expect(result).toMatchContract(openApiDoc, {
  ref: '#/components/responses/ModelRegistryResponse/content/application/json/schema',
  status: 200,
});
```

### Option 3: Custom Schema Loader (Advanced)
```typescript
import { ContractSchemaValidator } from '@odh-dashboard/contract-tests';

const schemaValidator = new ContractSchemaValidator();
schemaValidator.loadSchema('UserResponse', schema);

// Validate API response
const result = await api.get('/api/v1/users/123');
const validation = schemaValidator.validateResponse(result.data, 'UserResponse');

expect(validation.valid).toBe(true);
```

## Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `CONTRACT_MOCK_BFF_URL` | Override the Mock BFF server URL | `http://localhost:8080` |
| `CONTRACT_TEST_RESULTS_DIR` | Directory for test results and reports | `./contract-test-results` |

### Command Line Arguments
| Argument | Description | Default |
|----------|-------------|---------|
| `--open` | Open HTML report in browser after tests complete (disabled in CI) | `false` |
| `--build-bff` | Build BFF binary before starting (for performance) | `false` |

### Report Management

```bash
# Run tests without opening reports (default behavior)
npm run test:contract

# Run tests with automatic report opening
npm run test:contract -- --open

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

### Core Testing Classes
- **`ContractApiClient`** - HTTP client for API testing with built-in logging
- **`ContractSchemaValidator`** - JSON Schema validation with AJV
- **`OpenApiValidator`** - OpenAPI/Swagger specification validation

### BFF Management
- **`verifyBffHealth`** - Check BFF health endpoint
- **`waitForBffHealth`** - Wait for BFF to be ready
- **`runContractTests`** - Run contract tests programmatically

### Schema Management
- **`createTestSchema`** - Convert OpenAPI responses to testable schemas
- **`extractSchemaFromOpenApiResponse`** - Extract JSON schemas from OpenAPI specs
- **`convertOpenApiToJsonSchema`** - Convert OpenAPI schemas to JSON Schema format
- **`loadOpenAPISchema`** - Load OpenAPI specs from files
- **`createSchemaMatcher`** - Create schema matchers for validation

### Logging Utilities
- **`logTestSetup`** - Log test setup information
- **`logApiCall`** - Log API call details
- **`logApiResponse`** - Log API response details
- **`logApiError`** - Log API error details