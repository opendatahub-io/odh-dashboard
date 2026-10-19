/**
 * Error compatibility layer for `@kubernetes/client-node` >= 1.0.
 *
 * Intentionally has no runtime import of `@kubernetes/client-node` (the library is ESM-only and
 * expensive to transform in Jest); it is imported by widely shared modules such as `utils.ts`.
 */
import type { ApiException } from '@kubernetes/client-node';

type LegacyHttpResponse = {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
};

/** Status the API server returns for 401; the 2.x client drops the body for this status code. */
const UNAUTHORIZED_STATUS = {
  kind: 'Status',
  apiVersion: 'v1',
  metadata: {},
  status: 'Failure',
  message: 'Unauthorized',
  reason: 'Unauthorized',
  code: 401,
};

/** Keys kept by the 0.12.x deserialiser when a Status body was mapped onto a typed model. */
const TYPED_MODEL_KEYS = ['apiVersion', 'kind', 'metadata'];

const parseBody = (code: number, raw: unknown): unknown => {
  if (code === 401 && raw === undefined) {
    return UNAUTHORIZED_STATUS;
  }
  if (raw === '' || raw === undefined) {
    return undefined;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
};

const toLegacyBody = (parsed: unknown, isCustomObjectsApi: boolean): unknown => {
  if (parsed === undefined) {
    return undefined;
  }
  // 0.12.x deserialised error bodies into the method's return model: CustomObjectsApi ("object")
  // kept the full value; typed APIs kept only the model's known keys, dropping `message`.
  if (isCustomObjectsApi) {
    return parsed;
  }
  if (typeof parsed === 'object' && parsed !== null) {
    const record: Record<string, unknown> = { ...parsed };
    return Object.fromEntries(
      TYPED_MODEL_KEYS.filter((key) => key in record).map((key) => [key, record[key]]),
    );
  }
  return {};
};

/**
 * Reproduces the `@kubernetes/client-node` 0.12.x `HttpError` shape (`statusCode`, `body`,
 * `response.statusCode`, `response.body`) so existing catch sites keep working unchanged.
 * The original `ApiException` is kept as `cause`.
 *
 * Deliberately has no own `code` or `headers` properties (0.12.x `HttpError` had neither):
 * routes pass these errors to `reply.send()`, and Fastify copies `error.headers` onto the reply
 * and serialises `error.code` into the response body.
 */
export class K8sApiError extends Error {
  readonly name = 'HttpError';

  readonly statusCode: number;

  readonly body: unknown;

  readonly response: LegacyHttpResponse;

  /** The original 2.x `ApiException`. */
  readonly cause: ApiException<unknown>;

  constructor(e: ApiException<unknown>, isCustomObjectsApi: boolean) {
    super('HTTP request failed');
    this.cause = e;
    const parsed = parseBody(e.code, e.body);
    this.statusCode = e.code;
    this.response = { statusCode: e.code, body: parsed, headers: e.headers };
    this.body = toLegacyBody(parsed, isCustomObjectsApi);
  }
}

export const isK8sApiError = (e: unknown): e is K8sApiError => e instanceof K8sApiError;

/** Duck-typed check for the 2.x `ApiException` (avoids a runtime import of the library). */
export const isApiException = (e: unknown): e is ApiException<unknown> =>
  e instanceof Error &&
  !(e instanceof K8sApiError) &&
  'code' in e &&
  typeof e.code === 'number' &&
  'headers' in e &&
  'body' in e;

/** Maps a 2.x `ApiException` to a `K8sApiError`; any other error is returned unchanged. */
export const toK8sApiError = (e: unknown, isCustomObjectsApi: boolean): unknown =>
  isApiException(e) ? new K8sApiError(e, isCustomObjectsApi) : e;
