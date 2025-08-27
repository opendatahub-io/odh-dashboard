// eslint-disable-next-line import/no-named-as-default
import Ajv2020 from 'ajv/dist/2020';
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

export function toMatchContract(
  this: jest.MatcherContext,
  received: { status?: number; headers?: Record<string, unknown>; data?: unknown } | unknown,
  schema: Schema,
  options?: Options,
): { pass: boolean; message: () => string } {
  const { ref, expectedStatus, expectedHeaders } = options || {};

  const isHttpLike =
    typeof received === 'object' && received !== null && 'data' in (received as any);
  const payload = isHttpLike ? (received as any).data : received;

  // Optional status check
  if (typeof expectedStatus === 'number') {
    const actualStatus = isHttpLike ? (received as any).status : undefined;
    if (actualStatus !== expectedStatus) {
      return {
        pass: false,
        message: () =>
          `Expected status ${expectedStatus} but received ${actualStatus ?? 'undefined'}`,
      };
    }
  }

  // Optional headers check (normalize keys to lower-case and support string|string[])
  if (expectedHeaders && isHttpLike) {
    const rawHeaders: Record<string, unknown> = (received as any).headers || {};
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

  // Schema validation (register full schema to resolve internal $refs)
  let pass = false;
  let lastErrors: ErrorObject[] | undefined;
  try {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    if (ref) {
      // Register schema with a unique id to avoid collisions
      const uniqueId = `inmem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      ajv.addSchema(schema, uniqueId);
      const refPath = ref.startsWith('#') ? `${uniqueId}${ref}` : `${uniqueId}#${ref}`;
      pass = ajv.validate({ $ref: refPath }, payload) as boolean;
      lastErrors = ajv.errors as ErrorObject[] | undefined;
    } else {
      // Validate against whole schema
      const validateWhole: ValidateFunction = ajv.compile(schema);
      pass = validateWhole(payload) as boolean;
      lastErrors = validateWhole.errors as ErrorObject[] | undefined;
    }
  } catch (e) {
    return { pass: false, message: () => `Failed to compile schema: ${(e as Error).message}` };
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
