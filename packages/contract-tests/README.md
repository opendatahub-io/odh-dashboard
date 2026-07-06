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

### 2. Run your first test

```bash
npm run test:contract
```

That's it! The framework handles everything automatically.

## Quick Start

### Option 1: All-in-one Script
Run contract tests with one command:

```bash
# From any package directory (preferred via workspace)
npm run test:contract

# With HTML reports (opens browser automatically)
npm run test:contract -- --open

# Combine options
npm run test:contract -- --open

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
- ✅ **Flexible reporting** - Use `--open` to automatically open HTML reports

## Directory Structure

Your package should have this structure:

```
your-package/
├── contract-tests/           # Contract tests directory
│   ├── __tests__/
│   │   └── *.test.ts        # Your test files
│   └── jest.config.js       # Jest configuration (auto-generated)
└── upstream/
    └── bff/                 # Mock BFF backend
        ├── Makefile         # Build and run targets
        ├── go.mod           # Go module
        └── cmd/             # BFF server code (main.go, etc.)
```

**What's automatically provided:**
- ✅ Jest types for testing (`describe`, `it`, `expect`)
- ✅ Contract-tests types for matchers (`toMatchContract`)
- ✅ Standard ODH TypeScript configuration

## BFF Lifecycle Management

The contract test runner automatically manages your Mock BFF lifecycle:

### Local Development (Development Mode)
1. **Runs** your BFF directly using `go run ./cmd` (no build step)
2. **Starts** your BFF server in mock mode with `--mock-k8s-client --mock-mr-client --port 8108`
3. **Waits** for BFF to be healthy (checks health endpoint)
4. **Runs** your contract tests using the shared Jest harness
5. **Cleans up** BFF process when tests complete

### CI/CD Pipeline (Production Mode)
1. **Runs** your BFF using `go run ./cmd` (development/production parity)
2. **Starts** your BFF server in mock mode with `--mock-k8s-client --mock-mr-client --port 8108`
3. **Waits** for BFF to be healthy (checks health endpoint)
4. **Runs** your contract tests using the shared Jest harness
5. **Cleans up** BFF process when tests complete

Your BFF must have a `cmd/` directory with a main.go file that accepts these flags:

```go
flag.BoolVar(&cfg.MockK8Client, "mock-k8s-client", false, "Use mock Kubernetes client")
flag.BoolVar(&cfg.MockMRClient, "mock-mr-client", false, "Use mock Model Registry client")
flag.IntVar(&cfg.Port, "port", 8108, "API server port")
```

**Note**: The BFF must expose a `/healthcheck` endpoint for the runner to detect when it's ready.

## Writing Tests

Create test files in `contract-tests/__tests__/`:

```typescript
/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('API Contract Tests', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8108';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  // Load your OpenAPI schema (update path to match your API spec)
  const apiSchema = loadOpenAPISchema('upstream/api/openapi/your-api-spec.yaml');

  it('should return successful response', async () => {
    const result = await apiClient.get('/api/v1/your-endpoint');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/SuccessResponse/content/application/json/schema',
      status: 200,
    });
  });

  it('should handle error cases', async () => {
    const result = await apiClient.get('/api/v1/your-endpoint?invalid=param');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/ErrorResponse/content/application/json/schema',
      status: 400,
    });
  });
});
```

## Schema Validation Approach

### Using OpenAPI Schemas (Recommended)
```typescript
/**
 * @jest-environment node
 */
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

describe('Your API Endpoint', () => {
  const baseUrl = process.env.CONTRACT_MOCK_BFF_URL || 'http://localhost:8108';
  const apiClient = new ContractApiClient({
    baseUrl,
    defaultHeaders: {
      'kubeflow-userid': 'dev-user@example.com',
      'kubeflow-groups': 'system:masters',
    },
  });

  // Load OpenAPI schema from your checked-in API specs
  const apiSchema = loadOpenAPISchema('upstream/api/openapi/your-api-spec.yaml');

  it('validates successful response', async () => {
    const result = await apiClient.get('/api/v1/your-endpoint');
    expect(result).toMatchContract(apiSchema, {
      ref: '#/components/responses/SuccessResponse/content/application/json/schema',
      status: 200,
    });
  });
});
```

### Alternative: Manual JSON Schema
```typescript
import { ContractSchemaValidator } from '@odh-dashboard/contract-tests';

// For simple schemas or when OpenAPI is not available
const schemaValidator = new ContractSchemaValidator();

// Define schema manually
const apiResponseSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string' }
        },
        required: ['id', 'name']
      }
    },
    total: { type: 'number' }
  }
};

schemaValidator.loadSchema('ListResponse', apiResponseSchema);

it('validates with manual schema', async () => {
  const result = await apiClient.get('/api/v1/your-endpoint');
  const validation = schemaValidator.validateResponse(result.data, 'ListResponse');
  expect(validation.valid).toBe(true);
});
```

## Mock BFF Requirements

Contract tests require a Mock BFF that can be built and run. Your BFF should have a Makefile with standard targets:

```makefile
# Key targets your BFF should support:
build:    # Builds the BFF binary
run:      # Runs the BFF server
clean:    # Cleans build artifacts
test:     # Runs unit tests

# Example usage:
make build    # Creates the BFF binary
make run      # Starts the BFF server
```

Your BFF must support mock flags for testing:
- `--mock-k8s-client`: Use mock Kubernetes client
- `--mock-mr-client`: Use mock Model Registry client
- `--port`: Specify server port
- `--allowed-origins`: CORS configuration

## Advanced Schema Handling

For complex scenarios or when working with OpenAPI schemas that need conversion:

### Converting OpenAPI Responses to JSON Schema

```typescript
import {
  ContractSchemaValidator,
  createTestSchema,
  extractSchemaFromOpenApiResponse,
} from '@odh-dashboard/contract-tests';

describe('Advanced Schema Validation', () => {
  let schemaValidator: ContractSchemaValidator;

  beforeAll(() => {
    schemaValidator = new ContractSchemaValidator();

    // Example: Convert OpenAPI response structure
    const openApiResponse = {
      '200': {
        description: 'API list response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: { type: 'string' }
                },
                total: { type: 'number' }
              }
            }
          }
        }
      }
    };

    // Convert to testable schema
    const testSchema = createTestSchema(openApiResponse, 'ListResponse');
    if (testSchema) {
      schemaValidator.loadSchema(testSchema.name, testSchema.schema);
    }
  });

  it('validates converted schema', () => {
    const mockResponse = { data: ['item1', 'item2'], total: 2 };
    const validation = schemaValidator.validateResponse(mockResponse, 'ListResponse');
    expect(validation.valid).toBe(true);
  });
});
```

### Available Schema Utilities

- `loadOpenAPISchema(path)` - Load OpenAPI spec from file (recommended)
- `createTestSchema(openApiResponse, name)` - Convert OpenAPI to JSON Schema
- `extractSchemaFromOpenApiResponse(response)` - Extract schema from OpenAPI response
- `ContractSchemaValidator` - Manual validation for complex cases


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

Contract testing validates API responses against schemas. The framework supports multiple approaches:

### Primary Approach: OpenAPI Schemas (Recommended)
```typescript
import { ContractApiClient, loadOpenAPISchema } from '@odh-dashboard/contract-tests';

// Load your checked-in OpenAPI specification
const apiSchema = loadOpenAPISchema('upstream/api/openapi/your-api-spec.yaml');

// Validate against OpenAPI schema reference
expect(result).toMatchContract(apiSchema, {
  ref: '#/components/responses/SuccessResponse/content/application/json/schema',
  status: 200,
});
```

### Alternative: Direct JSON Schema
```typescript
// For simple cases or when OpenAPI isn't available
const schema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

expect(result).toMatchContract(schema, { status: 200 });
```

### Advanced: Programmatic Schema Validation
```typescript
import { ContractSchemaValidator } from '@odh-dashboard/contract-tests';

const schemaValidator = new ContractSchemaValidator();

// Load custom schemas for complex validation scenarios
schemaValidator.loadSchema('CustomResponse', {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { type: 'object' }
  },
  required: ['success']
});

// Use in tests
const result = await apiClient.get('/api/v1/custom-endpoint');
const validation = schemaValidator.validateResponse(result.data, 'CustomResponse');
expect(validation.valid).toBe(true);
```


## Troubleshooting

If something goes wrong:

1. **Check directories**: Ensure you have `contract-tests/` and `upstream/bff/` directories
2. **Verify BFF setup**: Check that your BFF has a Makefile with `build` and `run` targets
3. **Test BFF manually**: Try `make build && make run` in your BFF directory
4. **Check contract tests**: Run `npm run test:contract` from your package directory
5. **Verify OpenAPI specs**: Ensure your OpenAPI files are in the expected location
6. **Check environment**: Make sure `odh-ct-bff-consumer` command is available

## Examples

See the `packages/*/contract-tests/` directories for working examples of how different packages implement contract testing.

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