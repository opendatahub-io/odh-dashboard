// Schema validation helpers for minimal contract testing
export const loadOpenAPISchema = (
  relativePath = 'upstream/api/openapi/spec.yaml',
): Record<string, unknown> => {
  const path = require('path');
  const fs = require('fs');
  const yaml = require('js-yaml');
  const openApiPath = path.resolve(process.cwd(), relativePath);
  const content = fs.readFileSync(openApiPath, 'utf8');
  const loaded = yaml.load(content);
  return loaded && typeof loaded === 'object' ? loaded : {};
};

export const createSchemaMatcher = (
  schema: Record<string, unknown>,
  options: { ref?: string; expectedStatus?: number } = {},
): ((result: { status?: number; data?: unknown }) => {
  data: unknown;
  status?: number;
  __contractSchema: Record<string, unknown>;
  __contractOptions: { ref?: string; expectedStatus?: number };
}) => {
  return (result: { status?: number; data?: unknown }) => ({
    data: result.data,
    status: result.status,
    __contractSchema: schema,
    __contractOptions: options,
  });
};
