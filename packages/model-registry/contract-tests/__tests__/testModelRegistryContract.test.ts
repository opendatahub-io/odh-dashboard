/* eslint-env jest */
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ContractSchemaValidator } from '@odh-dashboard/contract-tests/schema-validator';

describe('Model Registry Contract Tests', () => {
  let schemaValidator: ContractSchemaValidator;

  beforeAll(() => {
    schemaValidator = new ContractSchemaValidator();

    // Load schemas from external JSON files
    const schemasPath = path.join(__dirname, '../schemas');
    const modelRegistrySchemas = JSON.parse(
      fs.readFileSync(path.join(schemasPath, 'model-registry-api.json'), 'utf8'),
    );

    // Load the entire schema document to resolve internal $refs
    schemaValidator.loadSchema('ModelRegistryAPI', modelRegistrySchemas);

    // Load health check schema
    const healthSchema = {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy'] },
      },
      required: ['status'],
    };
    schemaValidator.loadSchema('HealthResponse', healthSchema);
  });

  it('should validate health response schema', () => {
    const mockHealthResponse = { status: 'healthy' };

    const validation = schemaValidator.validateResponse(mockHealthResponse, 'HealthResponse');
    expect(validation.valid).toBe(true);
  });

  it('should reject invalid health response', () => {
    const invalidHealthResponse = {};

    const validation = schemaValidator.validateResponse(invalidHealthResponse, 'HealthResponse');
    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
  });
});
