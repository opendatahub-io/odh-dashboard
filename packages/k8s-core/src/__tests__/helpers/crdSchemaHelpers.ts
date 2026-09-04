import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export type OpenAPISchema = {
  type?: string;
  format?: string;
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  enum?: unknown[];
  additionalProperties?: boolean | OpenAPISchema;
  nullable?: boolean;
  'x-kubernetes-int-or-string'?: boolean;
  'x-kubernetes-list-type'?: string;
};

export type CrdDocument = {
  spec: {
    group: string;
    names: { kind: string; plural: string };
    versions: Array<{
      name: string;
      served: boolean;
      storage?: boolean;
      schema?: { openAPIV3Schema?: OpenAPISchema };
    }>;
  };
};

export const loadCrd = (filePath: string): CrdDocument => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return yaml.load(raw) as CrdDocument;
};

export const getVersionSchema = (crd: CrdDocument, version: string): OpenAPISchema | undefined => {
  const entry = crd.spec.versions.find((v) => v.name === version && v.served);
  return entry?.schema?.openAPIV3Schema;
};

export const resolveSchemaPath = (
  schema: OpenAPISchema | undefined,
  dottedPath: string,
): OpenAPISchema | undefined => {
  if (!schema) {
    return undefined;
  }

  const segments = dottedPath.split('.');
  let current: OpenAPISchema | undefined = schema;

  for (const segment of segments) {
    if (current.type === 'array') {
      current = current.items;
      if (!current) {
        return undefined;
      }
    }

    if (!current.properties?.[segment]) {
      return undefined;
    }
    current = current.properties[segment];
  }

  return current;
};

const schemaTypes = (schema: OpenAPISchema | undefined): string[] => {
  if (!schema) {
    return [];
  }

  const types: string[] = [];
  if (schema.type) {
    types.push(schema.type);
  }
  if (schema['x-kubernetes-int-or-string']) {
    types.push('integer', 'string');
  }
  if (schema.nullable) {
    types.push('null');
  }
  return types;
};

export const schemaSupportsType = (
  schema: OpenAPISchema | undefined,
  expected: 'boolean' | 'string' | 'number' | 'integer' | 'object' | 'array',
): boolean => {
  const types = schemaTypes(schema);
  if (types.length === 0) {
    return expected === 'object';
  }

  if (expected === 'number') {
    return types.some((t) => t === 'number' || t === 'integer');
  }

  return types.includes(expected);
};

export const schemaEnumValues = (schema: OpenAPISchema | undefined): string[] => {
  if (!schema?.enum) {
    return [];
  }
  return schema.enum.map((value) => String(value));
};

export const fixturePath = (...segments: string[]): string =>
  path.join(__dirname, '..', 'fixtures', 'kueue-crds', ...segments);

export const assertModelVersionServed = (
  crdFile: string,
  apiVersion: string,
  apiGroup?: string,
): void => {
  const crd = loadCrd(crdFile);
  const versionName = apiVersion.replace(apiGroup ? `${apiGroup}/` : '', '').replace(/^.*\//, '');
  const version = crd.spec.versions.find((v) => v.name === versionName);
  expect(version).toBeDefined();
  expect(version?.served).toBe(true);
  if (apiGroup) {
    expect(crd.spec.group).toBe(apiGroup);
  }
};
