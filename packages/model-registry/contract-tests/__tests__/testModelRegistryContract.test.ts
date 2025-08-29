import { ContractApiClient, verifyBffHealth, ContractSchemaValidator } from '@odh-dashboard/contract-tests';

describe('Model Registry Contract Tests', () => {
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
    
    // Load schemas (teams will define their own schemas)
    const healthSchema = {
      type: 'object',
      properties: {
        status: { type: 'string' }
      },
      required: ['status']
    };
    
    const modelRegistrySchema = {
      type: 'object',
      properties: {
        models: { type: 'array' },
        total: { type: 'number' }
      },
      required: ['models', 'total']
    };
    
    schemaValidator.loadSchema('HealthResponse', healthSchema);
    schemaValidator.loadSchema('ModelRegistryResponse', modelRegistrySchema);
  });

  it('should return valid response from health endpoint', async () => {
    const result = await apiClient.get('/health', 'Health Check');
    expect(result.status).toBe(200);
    
    // Validate response schema
    const validation = schemaValidator.validateResponse(result.data, 'HealthResponse', 'Health Check');
    expect(validation.valid).toBe(true);
  });

  it('should return valid response from model registry endpoint', async () => {
    const result = await apiClient.get('/api/v1/model-registry', 'Model Registry API');
    expect(result.status).toBe(200);
    
    // Validate response schema
    const validation = schemaValidator.validateResponse(result.data, 'ModelRegistryResponse', 'Model Registry API');
    expect(validation.valid).toBe(true);
  });
});
