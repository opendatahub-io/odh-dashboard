/* eslint-disable import/no-extraneous-dependencies */
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class ContractSchemaValidator {
  private ajv: Ajv;

  constructor() {
    // Use AJV 2020 to support modern JSON Schema features
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
    addFormats(this.ajv);
  }

  loadSchema(name: string, schema: Record<string, unknown>): void {
    // Register the schema with AJV to resolve internal $refs
    this.ajv.addSchema(schema, name);
  }

  validateResponse(response: unknown, schemaName: string): ValidationResult {
    const validate = this.ajv.getSchema(schemaName);

    if (!validate) {
      throw new Error(`Schema '${schemaName}' not found`);
    }

    const valid = validate(response);

    if (valid) {
      return { valid: true };
    }

    return {
      valid: false,
      errors: ['Schema validation failed'],
    };
  }
}
