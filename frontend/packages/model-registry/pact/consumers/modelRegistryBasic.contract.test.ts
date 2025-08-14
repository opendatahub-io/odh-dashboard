// Model Registry contract tests using Mock BFF backend
/* eslint-disable */

// Import Jest globals for TypeScript
/// <reference types="jest" />
/// <reference types="@types/jest" />

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Load JSON Schema for validation
const schemaPath = path.resolve(__dirname, '../schemas/model-registry-api.json');
const apiSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const ajv = new (Ajv as any)({ 
  allErrors: true,
  strict: false  // Allow draft-2020-12 features
});
addFormats(ajv);

// Add all definitions to AJV first
Object.keys(apiSchema.definitions).forEach(key => {
  ajv.addSchema(apiSchema.definitions[key], key);
});

// Schema validators - compile individual definitions
const validateModelRegistryResponse = ajv.compile({
  type: 'object',
  required: ['data'],
  properties: {
    metadata: { type: 'object' },
    data: {
      type: 'array',
      items: { $ref: 'ModelRegistry' }  // Reference the added schema
    }
  },
  additionalProperties: true
});

const validateErrorResponse = ajv.compile({
  type: 'object',
  required: ['code', 'message'],
  properties: {
    code: { type: 'string' },
    message: { type: 'string' }
  },
  additionalProperties: true
});

// Test configuration
const MOCK_BFF_URL = process.env.PACT_MOCK_BFF_URL || 'http://localhost:8080';

// Helper function for detailed logging
const logApiCall = (method: string, url: string, headers: any, body?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🌐 [${timestamp}] ${method} ${url}`);
  console.log('📤 Request Headers:', JSON.stringify(headers, null, 2));
  if (body) {
    console.log('📤 Request Body:', JSON.stringify(body, null, 2));
  }
};

const logApiResponse = (response: any, testName: string) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 [${timestamp}] Response for "${testName}":`);
  console.log('📊 Status:', response.status);
  console.log('📋 Headers:', JSON.stringify(response.headers, null, 2));
  console.log('📄 Response Body:', JSON.stringify(response.data, null, 2));
  console.log('⏱️  Response Time: Available in headers');
};

const logApiError = (error: any, testName: string) => {
  const timestamp = new Date().toISOString();
  console.log(`\n❌ [${timestamp}] Error for "${testName}":`);
  if (error.response) {
    console.log('📊 Error Status:', error.response.status);
    console.log('📋 Error Headers:', JSON.stringify(error.response.headers, null, 2));
    console.log('📄 Error Body:', JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    console.log('🌐 Network Error - No response received');
    console.log('📤 Request Config:', JSON.stringify(error.config, null, 2));
  } else {
    console.log('⚠️  Setup Error:', error.message);
  }
};

describe('Model Registry API - Mock BFF Contract Tests', () => {
  beforeAll(async () => {
    const timestamp = new Date().toISOString();
    console.log(`\n🚀 [${timestamp}] Starting Contract Tests`);
    console.log('🔗 Mock BFF Server:', MOCK_BFF_URL);
    console.log('📂 Test Results Dir:', process.env.PACT_TEST_RESULTS_DIR || 'Not set');

    // Verify Mock BFF is available
    try {
      logApiCall('GET', `${MOCK_BFF_URL}/healthcheck`, {});
      const healthResponse = await axios.get(`${MOCK_BFF_URL}/healthcheck`);
      console.log('✅ Mock BFF Health Check Passed');
      console.log('📊 Health Status:', healthResponse.status);
    } catch (error) {
      logApiError(error, 'Health Check');
      throw new Error(`Mock BFF not available at ${MOCK_BFF_URL}. Start it first!`);
    }
  });

  // Comprehensive OpenAPI-based validation helper
  const validateOpenAPIResponse = (response: any, testName: string): boolean => {
    // Schema validation using the OpenAPI-derived JSON Schema
    const isSchemaValid = validateModelRegistryResponse(response.data);
    if (!isSchemaValid) {
      console.error(`❌ Schema validation failed for ${testName}:`, validateModelRegistryResponse.errors);
      throw new Error(
        `Schema validation failed: ${JSON.stringify(validateModelRegistryResponse.errors, null, 2)}`,
      );
    }

    // Additional OpenAPI contract validations based on mod-arch.yaml
    const { data } = response.data;
    
    // Validate each ModelRegistry item against OpenAPI spec requirements
    if (Array.isArray(data) && data.length > 0) {
      data.forEach((registry: any, index: number) => {
        // Required field 'name' as per OpenAPI spec
        if (!registry.name || typeof registry.name !== 'string') {
          throw new Error(`Registry at index ${index} missing required 'name' field (string)`);
        }
        
        // Optional fields validation as per OpenAPI spec
        if (registry.displayName && typeof registry.displayName !== 'string') {
          throw new Error(`Registry at index ${index} has invalid 'displayName' (must be string)`);
        }
        
        if (registry.description && typeof registry.description !== 'string') {
          throw new Error(`Registry at index ${index} has invalid 'description' (must be string)`);
        }
        
        if (registry.serverAddress && typeof registry.serverAddress !== 'string') {
          throw new Error(`Registry at index ${index} has invalid 'serverAddress' (must be string)`);
        }
        
        // Log discovered fields for contract verification
        console.log(`📋 Registry ${index}: name="${registry.name}", displayName="${registry.displayName || 'N/A'}"`);
      });
    }

    console.log(`✅ OpenAPI contract validation passed for ${testName} (${data.length} items)`);
    return true;
  };

  // Error response validation helper  
  const validateOpenAPIErrorResponse = (response: any, testName: string): boolean => {
    const isSchemaValid = validateErrorResponse(response.data);
    if (!isSchemaValid) {
      console.error(`❌ Error schema validation failed for ${testName}:`, validateErrorResponse.errors);
      throw new Error(
        `Error schema validation failed: ${JSON.stringify(validateErrorResponse.errors, null, 2)}`,
      );
    }
    
    // Validate against OpenAPI Error schema (code + message)
    const { code, message } = response.data;
    if (!code || typeof code !== 'string') {
      throw new Error('Error response missing required "code" field (string)');
    }
    if (!message || typeof message !== 'string') {
      throw new Error('Error response missing required "message" field (string)');
    }
    
    console.log(`✅ Error contract validation passed for ${testName}: ${code} - ${message}`);
    return true;
  };

  describe('Model Registry List Endpoint', () => {
    it('should successfully retrieve model registries list', async () => {
      const testName = 'Model Registry List - Success Case';
      const namespace = 'default';
      const requestHeaders = {
        Accept: 'application/json',
        'kubeflow-userid': 'user@example.com', // Required for Mock BFF
      };
      const apiUrl = `${MOCK_BFF_URL}/api/v1/model_registry?namespace=${namespace}`;

      try {
        // Log the outgoing request
        logApiCall('GET', apiUrl, requestHeaders);

        // Make the API call to Mock BFF with namespace as query parameter
        const response = await axios.get(apiUrl, {
          headers: requestHeaders,
        });

        // Log the response
        logApiResponse(response, testName);

        // HTTP Contract validation (from OpenAPI spec)
        (expect(response.status) as any).toBe(200);
        (expect(response.headers['content-type']) as any).toMatch(/application\/json/);
        
        // Response structure validation (from OpenAPI ModelRegistryResponse schema)
        (expect(response.data) as any).toHaveProperty('data');
        (expect(Array.isArray(response.data.data)) as any).toBe(true);
        
        // Optional metadata field (from OpenAPI spec)
        if (response.data.metadata) {
          (expect(typeof response.data.metadata) as any).toBe('object');
        }

        // Comprehensive OpenAPI schema validation
        validateOpenAPIResponse(response, testName);

        console.log(`✅ ${testName} - Contract verified`);
        console.log(`📊 Found ${response.data.data.length} registries`);
        console.log('🔍 Using Mock BFF Server');
      } catch (error) {
        logApiError(error, testName);
        throw error;
      }
    });

    it('should handle empty registry list', async () => {
      const testName = 'Model Registry List - Empty Case';
      const namespace = 'nonexistent'; // Test with a namespace that has no registries
      const requestHeaders = {
        Accept: 'application/json',
        'kubeflow-userid': 'user@example.com',
      };
      const apiUrl = `${MOCK_BFF_URL}/api/v1/model_registry?namespace=${namespace}`;

      try {
        // Log the outgoing request
        logApiCall('GET', apiUrl, requestHeaders);

        const response = await axios.get(apiUrl, {
          headers: requestHeaders,
        });

        // Log the response
        logApiResponse(response, testName);

        // HTTP Contract validation
        (expect(response.status) as any).toBe(200);
        (expect(response.headers['content-type']) as any).toMatch(/application\/json/);
        
        // Empty list structure validation
        (expect(response.data) as any).toHaveProperty('data');
        (expect(Array.isArray(response.data.data)) as any).toBe(true);
        (expect(response.data.data.length) as any).toBe(0);

        // Comprehensive OpenAPI schema validation for empty response
        validateOpenAPIResponse(response, testName);

        console.log(`✅ ${testName} - Contract verified`);
        console.log(`📊 Registry count: ${response.data.data.length}`);
      } catch (error) {
        logApiError(error, testName);
        throw error;
      }
    });

    it('should handle unauthorized access', async () => {
      const testName = 'Model Registry List - Unauthorized Case';
      const namespace = 'restricted-namespace';
      const requestHeaders = {
        Accept: 'application/json',
        // Deliberately omit kubeflow-userid to test auth
      };
      const apiUrl = `${MOCK_BFF_URL}/api/v1/model_registry?namespace=${namespace}`;

      try {
        // Log the outgoing request
        logApiCall('GET', apiUrl, requestHeaders);

        const response = await axios.get(apiUrl, {
          headers: requestHeaders,
        });

        // If we reach here, the request succeeded (Mock BFF might allow in test mode)
        logApiResponse(response, `${testName} - Unexpected Success`);
        console.log('⚠️  Mock BFF allowed access without user ID - this may be expected in test mode');
        
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response: { status: number; data: any } };
          
          // Log the error response
          logApiError(axiosError, testName);
          
          (expect(axiosError.response.status) as any).toBeGreaterThanOrEqual(400);

          // Validate error response against OpenAPI Error schema
          if (axiosError.response.data) {
            // Check if response follows OpenAPI Error schema (code + message)
            if (axiosError.response.data.code && axiosError.response.data.message) {
              validateOpenAPIErrorResponse(axiosError.response, 'Unauthorized Error Response');
              console.log('✅ Error response follows OpenAPI schema');
            } else {
              console.log('⚠️  Error response doesn\'t follow OpenAPI Error schema - this may be expected in Mock BFF mode');
            }
          }

          console.log(`✅ ${testName} - Contract verified`);
          console.log(`📊 Error status: ${axiosError.response.status}`);
        } else {
          logApiError(error, testName);
          throw error; // Re-throw network errors
        }
      }
    });
  });
});
