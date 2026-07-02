import { ProxyTransientError } from '#~/api/proxyUtils';
import { isCommonStateError, NotReadyError } from '#~/utilities/useFetchState';

type ErrorKF = {
  error?: string;
  code: number;
  message: string;
  details?: Record<string, unknown> | unknown[];
};
type ResultErrorKF = {
  /** Has stack trace */
  error_details: string;
  /** Displayable message */
  error_message: string;
};

/**
 * Error class for KFP API failures that mimics AxiosError structure
 * for compatibility with getGenericErrorCode.
 */
export class PipelineAPIError extends Error {
  public response: { status: number };

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PipelineAPIError';
    this.response = { status };
  }
}

const isErrorKF = (e: unknown): e is ErrorKF => {
  if (typeof e !== 'object' || e === null) {
    return false;
  }
  // Must have error (string), code (number), and message (string)
  // The 'error' field distinguishes true KFP errors from other responses (e.g., gRPC status without error field)
  if (
    !(
      'error' in e &&
      'code' in e &&
      'message' in e &&
      typeof e.error === 'string' &&
      typeof e.code === 'number' &&
      typeof e.message === 'string'
    )
  ) {
    return false;
  }
  // Filter out success responses: gRPC OK (0) or HTTP 2xx codes
  // Only treat as error if code indicates failure
  if (e.code === 0 || (e.code >= 200 && e.code < 300)) {
    return false;
  }
  return true;
};

const isErrorDetailsKF = (result: unknown): result is ResultErrorKF =>
  typeof result === 'object' &&
  result !== null &&
  ['error_details', 'error_message'].every((key) => key in result);

/**
 * Check if a code is a valid gRPC status code (0-16).
 * See: https://grpc.github.io/grpc/core/md_doc_statuscodes.html
 */
const isGrpcCode = (code: number): boolean => code >= 0 && code <= 16;

/**
 * Map gRPC error codes to HTTP-like status codes for consistent error handling.
 * Returns undefined if the code is not a valid gRPC code (to avoid misclassifying HTTP errors).
 * See: https://grpc.github.io/grpc/core/md_doc_statuscodes.html
 */
const grpcCodeToHttpStatus = (code: number): number | undefined => {
  if (!isGrpcCode(code)) {
    // Not a gRPC code - might be an HTTP status already
    return undefined;
  }

  switch (code) {
    case 5: // NOT_FOUND
      return 404;
    case 3: // INVALID_ARGUMENT
      return 400;
    case 7: // PERMISSION_DENIED
      return 403;
    case 16: // UNAUTHENTICATED
      return 401;
    case 13: // INTERNAL
      return 500;
    case 14: // UNAVAILABLE
      return 503;
    default:
      // Other gRPC codes (CANCELLED, DEADLINE_EXCEEDED, etc.) → generic server error
      return 500;
  }
};

export const handlePipelineFailures = <T>(promise: Promise<T>): Promise<T> =>
  promise
    .then((result) => {
      if (isErrorKF(result)) {
        throw result;
      }
      if (isErrorDetailsKF(result)) {
        const errorKF: ErrorKF = {
          error: result.error_message,
          code: 400, // assume it's our fault
          message: result.error_message,
          details: { trace: result.error_details },
        };
        throw errorKF;
      }

      return result;
    })
    .catch((e) => {
      if (isErrorKF(e)) {
        // Convert gRPC code to HTTP status, or use the code as-is if it's already HTTP
        const httpStatus = grpcCodeToHttpStatus(e.code) ?? e.code;
        throw new PipelineAPIError(e.error || e.message, httpStatus);
      }
      if (isCommonStateError(e)) {
        // Common state errors are handled by useFetchState at storage level, let them deal with it
        throw e;
      }

      // Transient errors (e.g., 502 Bad Gateway during pipeline server startup) happen when
      // the OpenShift route is Admitted but HAProxy hasn't finished propagating the config.
      // Treat as "not ready" so useFetch keeps the loading spinner and silently retries
      // on the next poll — no error message is shown to the user.
      if (e instanceof ProxyTransientError) {
        throw new NotReadyError('Pipeline server route is not yet available');
      }

      // eslint-disable-next-line no-console
      console.error('Unknown pipeline API error', e);
      throw new Error('Error communicating with pipeline server');
    });
