/* eslint-disable @typescript-eslint/no-explicit-any, no-console, @typescript-eslint/no-unsafe-assignment */
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ApiResponse } from '../helpers/logging';

export interface SchemaValidationConfig {
  schemaPath: string;
  strict?: boolean;
  additionalSchemas?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: any[] | null;
  message?: string;
}

/**
 * Schema validator for contract testing
 */
export class ContractSchemaValidator {
  private ajv: Ajv;
  private schemas: Map<string, any> = new Map();

  constructor(config: { strict?: boolean } = {}) {
    this.ajv = new Ajv({ 
      strict: config.strict ?? false,
      allErrors: true,
      validateSchema: false, // Disable meta-schema validation to avoid issues with draft versions
    });
    addFormats(this.ajv);
  }

  /**
   * Load a schema from a JSON file or object
   */
  async loadSchema(schemaId: string, schema: any): Promise<void> {
    try {
      // Add the main schema
      this.ajv.addSchema(schema, schemaId);
      this.schemas.set(schemaId, schema);

      // Add any definitions as separate schemas for $ref support
      if (schema.definitions) {
        Object.keys(schema.definitions).forEach(key => {
          this.ajv.addSchema(schema.definitions[key], key);
        });
      }

      console.log(`✅ Schema loaded: ${schemaId}`);
    } catch (error) {
      console.error(`❌ Failed to load schema ${schemaId}:`, error);
      throw error;
    }
  }

  /**
   * Validate an API response against a schema
   */
  validateResponse(
    response: ApiResponse | any,
    schemaId: string,
    testName: string,
    schemaPath?: string,
    isErrorResponse?: boolean
  ): ValidationResult {
    try {
      // For error responses, validate against the error data structure
      const dataToValidate = isErrorResponse ? response : response.data;
      const isValid = this.ajv.validate(schemaId, dataToValidate);

      if (isValid) {
        console.log(`✅ OpenAPI contract validation passed for ${testName}`);
        return { isValid: true };
      }

      console.log(`❌ OpenAPI contract validation failed for ${testName}`);
      console.log('Schema errors:', this.ajv.errors);

      return {
        isValid: false,
        errors: this.ajv.errors,
        message: `Schema validation failed: ${this.ajv.errorsText()}`,
      };
    } catch (error) {
      const message = `Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.log(`⚠️ ${message}`);

      return {
        isValid: false,
        message,
      };
    }
  }

  /**
   * Validate that a response matches expected structure (less strict)
   */
  validateResponseStructure(
    response: ApiResponse,
    expectedProperties: string[],
    testName: string
  ): ValidationResult {
    try {
      const data = response.data as Record<string, any>;

      if (!data || typeof data !== 'object') {
        return {
          isValid: false,
          message: 'Response data is not an object',
        };
      }

      const missingProperties = expectedProperties.filter(prop => !(prop in data));

      if (missingProperties.length === 0) {
        console.log(`✅ Response structure validation passed for ${testName}`);
        return { isValid: true };
      }

      const message = `Missing properties: ${missingProperties.join(', ')}`;
      console.log(`❌ Response structure validation failed for ${testName}: ${message}`);

      return {
        isValid: false,
        message,
      };
    } catch (error) {
      const message = `Structure validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.log(`⚠️ ${message}`);

      return {
        isValid: false,
        message,
      };
    }
  }

  /**
   * Get available schemas
   */
  getAvailableSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }
}
