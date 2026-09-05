// Schema validation helpers for minimal contract testing
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const isOpenApiDocument = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Resolve OpenAPI paths relative to the consumer package root. */
const resolveOpenAPIPath = (relativePath: string): string => {
  const cwd = process.cwd();

  const fromCwd = path.resolve(cwd, relativePath);
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }

  // Jest runs from <package>/contract-tests; OpenAPI specs live at package root.
  const packageRoot = path.basename(cwd) === 'contract-tests' ? path.dirname(cwd) : cwd;
  return path.resolve(packageRoot, relativePath);
};

export const loadOpenAPISchema = (
  relativePath = 'upstream/api/openapi/spec.yaml',
): Record<string, unknown> => {
  const openApiPath = resolveOpenAPIPath(relativePath);
  const content = fs.readFileSync(openApiPath, 'utf8');
  const loaded = yaml.load(content);
  return isOpenApiDocument(loaded) ? loaded : {};
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
