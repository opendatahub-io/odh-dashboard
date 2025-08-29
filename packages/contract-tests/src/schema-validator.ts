import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface SchemaValidationConfig {
  strict?: boolean;
  allErrors?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class ContractSchemaValidator {
  private ajv: Ajv;

  constructor(config: SchemaValidationConfig = {}) {
    this.ajv = new Ajv({
      strict: config.strict ?? false,
      allErrors: config.allErrors ?? true,
      verbose: true
    });
    
    addFormats(this.ajv);
  }

  loadSchema(name: string, schema: Record<string, unknown>): void {
    this.ajv.addSchema(schema as any, name);
  }

  validateResponse(response: unknown, schemaName: string, testName: string): ValidationResult {
    const validate = this.ajv.getSchema(schemaName);
    
    if (!validate) {
      throw new Error(`Schema '${schemaName}' not found`);
    }

    const valid = validate(response);
    
    if (valid) {
      return { valid: true };
    }

    const errors = validate.errors?.map(error => 
      `${error.instancePath} ${error.message}`
    ) || [];

    return {
      valid: false,
      errors
    };
  }

  validateData(data: unknown, schemaName: string, testName: string): ValidationResult {
    return this.validateResponse(data, schemaName, testName);
  }
}
