/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any, @typescript-eslint/dot-notation */
import { default as Ajv2020 } from 'ajv/dist/2020';
import type { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

type Schema = Record<string, unknown>;

type Options = {
  ref?: string; // JSON pointer within schema (e.g., "#/definitions/ModelRegistry")
  expectedStatus?: number;
  expectedHeaders?: Record<string, string | RegExp>;
};

// Note: AJV instance is created per assertion to avoid schema id collisions and
// memory growth across many tests. We register the whole schema with AJV to
// resolve internal $refs; a manual JSON pointer resolver is not needed here.

function formatAjvErrors(errors?: ErrorObject[]): string {
  if (!errors || errors.length === 0) return '';
  return errors
    .map((e) => {
      const instancePath = e.instancePath || e.schemaPath || '';
      const message = e.message || '';
      const params = JSON.stringify(e.params);
      return `at ${instancePath}: ${message} ${params}`.trim();
    })
    .join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHttpResponseLike(
  value: unknown,
): value is { status?: number; headers?: Record<string, unknown>; data?: unknown } {
  return isRecord(value) && 'data' in value;
}

export function toMatchContract(
  this: jest.MatcherContext,
  received: { status?: number; headers?: Record<string, unknown>; data?: unknown } | unknown,
  schema: Schema,
  options?: Options,
): { pass: boolean; message: () => string } {
  const { ref, expectedStatus, expectedHeaders } = options || {};

  let payload: unknown = received;
  if (isHttpResponseLike(received)) {
    payload = received.data;
  }

  // Optional status check
  if (typeof expectedStatus === 'number') {
    const actualStatus = isHttpResponseLike(received) ? received.status : undefined;
    if (actualStatus !== expectedStatus) {
      return {
        pass: false,
        message: () =>
          `Expected status ${expectedStatus} but received ${actualStatus ?? 'undefined'}`,
      };
    }
  }

  // Optional headers check (normalize keys to lower-case and support string|string[])
  if (expectedHeaders && isHttpResponseLike(received)) {
    const rawHeaders: Record<string, unknown> = isRecord(received.headers) ? received.headers : {};
    const normalizedHeaders: Record<string, string | string[] | undefined> = {};
    for (const [k, v] of Object.entries(rawHeaders)) {
      const keyLc = k.toLowerCase();
      if (Array.isArray(v)) {
        normalizedHeaders[keyLc] = v.map((it) => String(it));
      } else if (v != null) {
        normalizedHeaders[keyLc] = String(v);
      } else {
        normalizedHeaders[keyLc] = undefined;
      }
    }
    for (const [key, expected] of Object.entries(expectedHeaders)) {
      const actual = normalizedHeaders[key.toLowerCase()];
      if (expected instanceof RegExp) {
        if (Array.isArray(actual)) {
          const anyMatch = actual.some((h) => typeof h === 'string' && expected.test(h));
          if (!anyMatch) {
            return {
              pass: false,
              message: () => `Header ${key} did not match ${expected}; actual: ${String(actual)}`,
            };
          }
        } else if (typeof actual !== 'string' || !expected.test(actual)) {
          return {
            pass: false,
            message: () => `Header ${key} did not match ${expected}; actual: ${String(actual)}`,
          };
        }
      } else if (Array.isArray(actual)) {
        if (!actual.some((h) => h === expected)) {
          return {
            pass: false,
            message: () => `Header ${key} expected ${expected} but was ${String(actual)}`,
          };
        }
      } else if (actual !== expected) {
        return {
          pass: false,
          message: () => `Header ${key} expected ${expected} but was ${String(actual)}`,
        };
      }
    }
  }

  // Helper: shallow JSON pointer resolver for OAS3 docs
  const getByPointer = (root: unknown, pointer: string): unknown => {
    if (!pointer.startsWith('#/')) return undefined;
    const parts = pointer
      .slice(2)
      .split('/')
      .map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
    let current: unknown = root;
    for (const key of parts) {
      if (isRecord(current) && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  };

  // Helper: deep deref for $ref that point to components/schemas in OAS3
  const derefSchema = (
    node: unknown,
    componentsSchemas: Record<string, unknown> | undefined,
  ): unknown => {
    if (Array.isArray(node)) {
      return node.map((it) => derefSchema(it, componentsSchemas));
    }
    if (!isRecord(node)) return node;

    const n: Record<string, unknown> = { ...node };
    const refVal = n['$ref'];
    if (typeof refVal === 'string' && componentsSchemas) {
      const refPath: string = refVal;
      if (refPath.startsWith('#/components/schemas/')) {
        const name = refPath.split('/').pop() || '';
        const target = componentsSchemas[name];
        return derefSchema(target, componentsSchemas);
      }
    }
    const keysToRecurse = [
      'properties',
      'items',
      'allOf',
      'oneOf',
      'anyOf',
      'additionalProperties',
    ];
    for (const key of keysToRecurse) {
      if (key in n) {
        n[key] = derefSchema(n[key], componentsSchemas);
      }
    }
    return n;
  };

  // Schema validation (resolve ref against OAS3 if provided, otherwise treat schema as JSON Schema)
  let pass = false;
  let lastErrors: ErrorObject[] | undefined;
  try {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    let targetSchema: unknown = schema;
    if (ref) {
      const maybe = getByPointer(schema, ref.startsWith('#') ? ref : `#${ref}`);
      targetSchema = maybe ?? schema;
    }
    // If this looks like OAS3 (has components.schemas), deref $refs that point to components
    const componentsSchemas =
      isRecord(schema) && isRecord((schema as Record<string, unknown>).components)
        ? ((schema as Record<string, unknown>).components as { schemas?: Record<string, unknown> })
            .schemas
        : undefined;
    const finalSchema = derefSchema(targetSchema, componentsSchemas) as Schema;

    const validateWhole: ValidateFunction = ajv.compile(finalSchema);
    pass = Boolean(validateWhole(payload));
    lastErrors = validateWhole.errors ?? undefined;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { pass: false, message: () => `Failed to compile schema: ${msg}` };
  }
  if (pass) {
    return {
      pass: true,
      message: () => 'Payload matches contract',
    };
  }

  return {
    pass: false,
    message: () => `Schema validation failed:\n${formatAjvErrors(lastErrors)}`,
  };
}
