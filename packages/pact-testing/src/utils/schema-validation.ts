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

      console.log('✅ Schema loaded: ' + schemaId);
    } catch (error) {
      console.error('❌ Failed to load schema ' + schemaId + ':', error);
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
      
      let isValid: boolean;
      
      if (schemaPath) {
        // Validate against a JSON Pointer sub-schema
        const refSchema = { $ref: schemaId + (schemaPath.startsWith('#') ? schemaPath : '#' + schemaPath) };
        isValid = this.ajv.validate(refSchema, dataToValidate) as boolean;
      } else {
        // Validate against the whole schema
        isValid = this.ajv.validate(schemaId, dataToValidate) as boolean;
      }

      if (isValid) {
        console.log('✅ Contract validation passed for ' + testName);
        return { isValid: true };
      }

      console.log('❌ Contract validation failed for ' + testName);
      console.log('Schema errors:', this.ajv.errors);

      return {
        isValid: false,
        errors: this.ajv.errors,
        message: 'Schema validation failed: ' + this.ajv.errorsText(),
      };
    } catch (error) {
      const msg = 'Schema validation error: ' + (error instanceof Error ? error.message : 'Unknown error');
      console.log('⚠️ ' + msg);

      return {
        isValid: false,
        message: msg,
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

      const missingProps = expectedProperties.filter(prop => !(prop in data));

      if (missingProps.length === 0) {
        console.log('✅ Structure validation passed for ' + testName);
        return { isValid: true };
      }

      const msg = 'Missing properties: ' + missingProps.join(', ');
      console.log('❌ Structure validation failed for ' + testName + ': ' + msg);

      return {
        isValid: false,
        message: msg,
      };
    } catch (error) {
      const msg = 'Structure validation error: ' + (error instanceof Error ? error.message : 'Unknown error');
      console.log('⚠️ ' + msg);

      return {
        isValid: false,
        message: msg,
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