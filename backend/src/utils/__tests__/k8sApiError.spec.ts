import { ApiException, RequiredError } from '@kubernetes/client-node';
import { errorHandler, isHttpError } from '../../utils';
import { isApiException, isK8sApiError, K8sApiError, toK8sApiError } from '../k8sApiError';
import golden from './fixtures/clientNode012HttpErrors.json';

/**
 * `golden` holds real `HttpError` objects captured from `@kubernetes/client-node` 0.12.3 (typed
 * `CoreV1Api.readNamespacedConfigMap`) against a local server returning Kubernetes Status errors.
 */
type GoldenCase = {
  name: string;
  message: string;
  statusCode: number;
  body?: unknown;
  responseStatusCode: number;
  responseBody?: unknown;
  isHttpError: boolean;
  errorHandler: string;
};

const goldenCases: Record<string, GoldenCase> = golden;

/** The raw response body sent by the API server for each golden case (what 2.x puts on `body`). */
const RAW_BODIES: Record<string, string | undefined> = {
  e404: JSON.stringify(golden.e404.responseBody),
  e403: JSON.stringify(golden.e403.responseBody),
  e409: JSON.stringify(golden.e409.responseBody),
  // The 2.x generated client drops the body for 401 responses.
  e401: undefined,
  e500text: 'upstream connect error',
  e503empty: '',
};

const HEADERS = { 'content-type': 'application/json' };

const apiException = (key: string): ApiException<string | undefined> =>
  new ApiException(
    goldenCases[key].statusCode,
    'Unknown API Status Code!',
    RAW_BODIES[key],
    HEADERS,
  );

const legacyShape = (e: K8sApiError) => ({
  name: e.name,
  message: e.message,
  statusCode: e.statusCode,
  body: e.body,
  responseStatusCode: e.response.statusCode,
  responseBody: e.response.body,
  isHttpError: isHttpError(e),
  errorHandler: errorHandler(e),
});

const expectedShape = (g: GoldenCase) => ({
  name: g.name,
  message: g.message,
  statusCode: g.statusCode,
  body: g.body,
  responseStatusCode: g.responseStatusCode,
  responseBody: g.responseBody,
  isHttpError: g.isHttpError,
  errorHandler: g.errorHandler,
});

describe('K8sApiError', () => {
  describe('typed APIs', () => {
    it.each(Object.keys(goldenCases))(
      'should reproduce the 0.12.3 HttpError shape for %s',
      (key) => {
        const error = new K8sApiError(apiException(key), false);
        expect(legacyShape(error)).toStrictEqual(expectedShape(goldenCases[key]));
      },
    );
  });

  describe('CustomObjectsApi', () => {
    it.each(['e404', 'e403', 'e409', 'e401'])(
      'should expose the full parsed Status on body for %s',
      (key) => {
        const error = new K8sApiError(apiException(key), true);
        const g = goldenCases[key];
        expect(legacyShape(error)).toStrictEqual({
          ...expectedShape(g),
          body: g.responseBody,
        });
      },
    );

    it('should expose the raw text on body for a non-JSON response', () => {
      const error = new K8sApiError(apiException('e500text'), true);
      expect(error.body).toBe('upstream connect error');
      expect(error.response.body).toBe('upstream connect error');
      expect(errorHandler(error)).toBe('HTTP request failed');
    });

    it('should leave body undefined for an empty response', () => {
      const error = new K8sApiError(apiException('e503empty'), true);
      expect(error.body).toBeUndefined();
      expect(error.response.body).toBeUndefined();
    });

    it('should accept an already-parsed object body', () => {
      const status = { kind: 'Status', message: 'gone', code: 410 };
      const error = new K8sApiError(new ApiException(410, 'x', status, HEADERS), true);
      expect(error.body).toStrictEqual(status);
      expect(errorHandler(error)).toBe('gone');
    });
  });

  it('should expose response headers and the original exception as cause', () => {
    const original = apiException('e404');
    const error = new K8sApiError(original, false);
    expect(error).toBeInstanceOf(Error);
    expect(error.response.headers).toBe(HEADERS);
    expect(error.cause).toBe(original);
  });

  it('should not expose own code or headers properties', () => {
    // Fastify copies error.headers onto the reply and serialises error.code into the body.
    const error = new K8sApiError(apiException('e404'), false);
    expect(error).not.toHaveProperty('code');
    expect(error).not.toHaveProperty('headers');
  });
});

describe('isApiException', () => {
  it('should return true for an ApiException', () => {
    expect(isApiException(apiException('e404'))).toBe(true);
  });

  it('should return false for a K8sApiError', () => {
    expect(isApiException(new K8sApiError(apiException('e404'), false))).toBe(false);
  });

  it('should return false for other errors and values', () => {
    expect(isApiException(new Error('x'))).toBe(false);
    expect(isApiException(new RequiredError('CoreV1Api', 'readNamespace', 'name'))).toBe(false);
    expect(isApiException({ code: 404, headers: {}, body: '' })).toBe(false);
    expect(isApiException(undefined)).toBe(false);
    expect(isApiException(null)).toBe(false);
  });
});

describe('isK8sApiError', () => {
  it('should identify K8sApiError instances only', () => {
    expect(isK8sApiError(new K8sApiError(apiException('e409'), false))).toBe(true);
    expect(isK8sApiError(apiException('e409'))).toBe(false);
    expect(isK8sApiError(new Error('x'))).toBe(false);
  });
});

describe('toK8sApiError', () => {
  it('should map an ApiException to a K8sApiError', () => {
    const mapped = toK8sApiError(apiException('e403'), false);
    expect(mapped).toBeInstanceOf(K8sApiError);
    expect(isHttpError(mapped)).toBe(true);
  });

  it('should pass network errors through unchanged', () => {
    const networkError = Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
    });
    expect(toK8sApiError(networkError, false)).toBe(networkError);
    expect(isHttpError(networkError)).toBe(false);
  });

  it('should pass RequiredError through unchanged', () => {
    const requiredError = new RequiredError('CoreV1Api', 'readNamespacedConfigMap', 'name');
    expect(toK8sApiError(requiredError, true)).toBe(requiredError);
  });

  it('should pass non-error values through unchanged', () => {
    expect(toK8sApiError('boom', false)).toBe('boom');
  });
});
