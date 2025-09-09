/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/**
 * Utility to convert OpenAPI/Swagger schemas to JSON Schema for contract testing
 */

export interface OpenApiResponse {
  [statusCode: string]: {
    description?: string;
    content?: {
      [contentType: string]: {
        schema?: OpenApiSchema;
      };
    };
  };
}

export interface OpenApiSchema {
  type?: string;
  properties?: Record<string, OpenApiSchema | boolean>;
  required?: string[];
  items?: OpenApiSchema | OpenApiSchema[] | boolean;
  enum?: unknown[];
  format?: string;
  description?: string;
  $ref?: string;
  nullable?: boolean;
  additionalProperties?: OpenApiSchema | boolean;
  patternProperties?: Record<string, OpenApiSchema | boolean>;
  allOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  not?: OpenApiSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
  example?: unknown;
  title?: string;
  readOnly?: boolean;
  writeOnly?: boolean;
}

/**
 * Extract JSON Schema from OpenAPI response
 */
export function extractSchemaFromOpenApiResponse(
  openApiResponse: OpenApiResponse,
  statusCode = '200',
  contentType = 'application/json',
): OpenApiSchema | null {
  const { [statusCode]: responseEntry } = openApiResponse;
  const hasResponse = Object.prototype.hasOwnProperty.call(openApiResponse, statusCode);
  if (!hasResponse || !responseEntry) {
    return null;
  }
  const hasContent =
    responseEntry.content &&
    Object.prototype.hasOwnProperty.call(responseEntry.content, contentType);
  if (!hasContent) {
    return null;
  }
  const { content } = responseEntry;
  const contentEntry = content ? content[contentType] : undefined;
  return contentEntry && contentEntry.schema ? contentEntry.schema : null;
}

/**
 * Convert OpenAPI schema to simplified JSON Schema for testing
 */
export function convertOpenApiToJsonSchema(openApiSchema: OpenApiSchema): Record<string, unknown> {
  const jsonSchema: Record<string, unknown> = {};

  if (openApiSchema.type) {
    jsonSchema.type = openApiSchema.type;
  }

  if (openApiSchema.properties) {
    jsonSchema.properties = openApiSchema.properties;
  }

  if (openApiSchema.required) {
    jsonSchema.required = openApiSchema.required;
  }

  if (openApiSchema.items) {
    jsonSchema.items = openApiSchema.items;
  }

  if (openApiSchema.enum) {
    jsonSchema.enum = openApiSchema.enum;
  }

  if (openApiSchema.format) {
    jsonSchema.format = openApiSchema.format;
  }

  return jsonSchema;
}

/**
 * Helper function to quickly convert OpenAPI response to testable schema
 */
export function createTestSchema(
  openApiResponse: OpenApiResponse,
  schemaName: string,
  statusCode = '200',
): { name: string; schema: Record<string, unknown> } | null {
  const extractedSchema = extractSchemaFromOpenApiResponse(openApiResponse, statusCode);
  if (!extractedSchema) {
    return null;
  }

  const jsonSchema = convertOpenApiToJsonSchema(extractedSchema);
  return {
    name: schemaName,
    schema: jsonSchema,
  };
}

/**
 * Parse OpenAPI YAML and extract response schemas
 */
export function parseOpenApiResponses(): Record<string, OpenApiResponse> {
  // This is a simplified parser - in production you'd use a proper YAML parser
  const responses: Record<string, OpenApiResponse> = {};

  // For now, return empty responses - teams can manually define their schemas
  // In a real implementation, you'd use a proper YAML parser like js-yaml
  console.warn('parseOpenApiResponses is a placeholder - teams should manually define schemas');

  return responses;
}
