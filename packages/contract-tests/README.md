# ODH Dashboard Contract Testing

A simple, zero-config contract testing solution for ODH Dashboard packages.

## Quick Start

Teams can run contract tests with just one command:

```bash
# From any package directory
npx @odh-dashboard/contract-tests

# Or install globally
npm install -g @odh-dashboard/contract-tests
odh-contract-test
```

## What You Get

- ✅ **Zero configuration** - Works out of the box
- ✅ **Auto-discovery** - Finds BFF and test directories automatically
- ✅ **Built-in reporting** - HTML reports and coverage
- ✅ **BFF management** - Automatically builds and runs BFF server
- ✅ **Test utilities** - API client, schema validation, health checks
- ✅ **Schema validation** - OpenAPI/JSON Schema validation for API contracts

## Directory Structure

Your package should have this structure:

```
your-package/
├── contract-tests/           # Your contract tests
│   └── __tests__/
│       └── api.test.ts      # Your test files
└── upstream/
    └── bff/                 # BFF backend (teams create this)
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
    "test:contract": "odh-contract-test",
    "test:contract:watch": "odh-contract-test --watch",
    "test:contract:report": "odh-contract-test --report"
  }
}
```

## Writing Tests

Create test files in `contract-tests/__tests__/`:

```typescript
import { 
  ContractApiClient, 
  verifyBffHealth, 
  ContractSchemaValidator 
} from '@odh-dashboard/contract-tests';

describe('Your API Contract Tests', () => {
  let apiClient: ContractApiClient;
  let schemaValidator: ContractSchemaValidator;

  beforeAll(async () => {
    // Verify BFF is healthy
    await verifyBffHealth({ url: 'http://localhost:8080' });
    
    // Create API client
    apiClient = new ContractApiClient({
      baseUrl: 'http://localhost:8080'
    });

    // Set up schema validation
    schemaValidator = new ContractSchemaValidator();
    
    // Load your schemas
    const responseSchema = {
      type: 'object',
      properties: {
        data: { type: 'array' },
        total: { type: 'number' }
      },
      required: ['data', 'total']
    };
    
    schemaValidator.loadSchema('ResponseSchema', responseSchema);
  });

  it('should return valid response', async () => {
    const result = await apiClient.get('/api/v1/endpoint', 'Test Name');
    expect(result.status).toBe(200);
    
    // Validate response schema
    const validation = schemaValidator.validateResponse(
      result.data, 
      'ResponseSchema', 
      'Test Name'
    );
    expect(validation.valid).toBe(true);
  });
});
```

## BFF Requirements

Your BFF must have a Makefile with these targets:

```makefile
.PHONY: build run clean

build:
	go build -o bff-mock ./cmd/bff-mock

run:
	./bff-mock

clean:
	rm -f bff-mock
```

**Note**: Teams create their own BFF implementations. We don't provide templates.

## Available Commands

```bash
# Basic usage
odh-contract-test

# Watch mode
odh-contract-test --watch

# Generate HTML report
odh-contract-test --report

# Custom paths
odh-contract-test --bff-dir ./custom-bff --consumer-dir ./custom-tests

# Help
odh-contract-test --help
```

## No Configuration Required

- ❌ No Jest config files needed
- ❌ No TypeScript config needed
- ❌ No setup files needed
- ❌ No complex npm scripts needed

Everything is handled automatically by the preset configurations.

## What Happens Under the Hood

1. **Auto-discovery** - Finds your BFF and test directories
2. **BFF setup** - Builds and starts your BFF server
3. **Test execution** - Runs tests with optimized Jest configuration
4. **Cleanup** - Stops BFF server and generates reports
5. **Artifacts** - Creates HTML reports and coverage data

## Schema Validation

The main point of contract testing is to validate API responses against schemas:

```typescript
// Load your OpenAPI/JSON Schema
const schema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    status: { type: 'string', enum: ['active', 'inactive'] }
  },
  required: ['id', 'name', 'status']
};

schemaValidator.loadSchema('UserResponse', schema);

// Validate API response
const result = await apiClient.get('/api/v1/users/123', 'Get User');
const validation = schemaValidator.validateResponse(
  result.data, 
  'UserResponse', 
  'Get User'
);

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