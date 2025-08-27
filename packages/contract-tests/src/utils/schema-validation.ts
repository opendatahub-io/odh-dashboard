import type { JSONSchemaType } from 'ajv';
import AjvModule from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export interface SchemaValidationConfig {
  strict?: boolean;
  allErrors?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function hasDataProperty(value: unknown): value is { data?: unknown } {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, 'data');
}

/**
 * JSON Schema validator for contract testing
 */
export class ContractSchemaValidator {
  private ajv: AjvModule;

  private schemas: Map<string, JSONSchemaType<unknown>>;

  constructor(config?: SchemaValidationConfig) {
    this.ajv = new AjvModule({
      strict: config?.strict ?? false,
      allErrors: config?.allErrors ?? true,
    });

    addFormats(this.ajv);
    this.schemas = new Map();
  }

  /**
   * Load a schema for validation
   */
  async loadSchema(schemaId: string, schema: JSONSchemaType<unknown>): Promise<void> {
    this.schemas.set(schemaId, schema);
    this.ajv.addSchema(schema, schemaId);
  }

  /**
   * Validate a response against a schema
   */
  validateResponse(
    response: unknown,
    schemaId: string,
    _testName: string,
    schemaPath?: string,
    isErrorResponse = false,
  ): ValidationResult {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      return {
        isValid: false,
        errors: [`Schema '${schemaId}' not found`],
      };
    }

    let dataToValidate: unknown = response;
    if (!isErrorResponse && hasDataProperty(response)) {
      dataToValidate = response.data;
    }
    let isValid = false;

    try {
      if (schemaPath) {
        // Validate against a JSON Pointer sub-schema
        const refSchema = {
          $ref: `${schemaId}${schemaPath.startsWith('#') ? schemaPath : `#${schemaPath}`}`,
        };
        isValid = this.ajv.validate(refSchema, dataToValidate);
      } else {
        // Validate against the whole schema
        isValid = this.ajv.validate(schemaId, dataToValidate);
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }

    if (!isValid) {
      const errors = this.ajv.errors?.map((err) => {
        const path = err.instancePath || '/';
        const msg = err.message || 'Unknown error';
        return `${path}: ${msg}`;
      });

      return {
        isValid: false,
        errors: errors || ['Unknown validation error'],
      };
    }

    return { isValid: true };
  }

  /**
   * Validate a property against a schema
   */
  validateProperty(property: unknown, schemaId: string, propertyPath: string): ValidationResult {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      return {
        isValid: false,
        errors: [`Schema '${schemaId}' not found`],
      };
    }

    try {
      const refSchema = {
        $ref: `${schemaId}#${propertyPath.startsWith('/') ? propertyPath : `/${propertyPath}`}`,
      };
      const isValid = this.ajv.validate(refSchema, property);

      if (!isValid) {
        const errors = this.ajv.errors?.map((err) => {
          const path = err.instancePath || '/';
          const msg = err.message || 'Unknown error';
          return `${path}: ${msg}`;
        });

        return {
          isValid: false,
          errors: errors || ['Unknown validation error'],
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      };
    }
  }
}
