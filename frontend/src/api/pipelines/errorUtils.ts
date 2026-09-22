import { isCommonStateError, NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetchState';
import { ProxyTransientError } from '#~/api/proxyUtils';

type ErrorKF = {
  error: string;
  code: number;
  message: string;
  details?: Record<string, unknown>;
};
type ResultErrorKF = {
  /** Has stack trace */
  error_details: string;
  /** Displayable message */
  error_message: string;
};
export enum GrpcStatusCode {
  OK = 0,
  CANCELLED = 1,
  UNKNOWN = 2,
  INVALID_ARGUMENT = 3,
  DEADLINE_EXCEEDED = 4,
  NOT_FOUND = 5,
  ALREADY_EXISTS = 6,
  PERMISSION_DENIED = 7,
  RESOURCE_EXHAUSTED = 8,
  FAILED_PRECONDITION = 9,
  ABORTED = 10,
  OUT_OF_RANGE = 11,
  UNIMPLEMENTED = 12,
  INTERNAL = 13,
  UNAVAILABLE = 14,
  DATA_LOSS = 15,
  UNAUTHENTICATED = 16,
}
class GrpcError extends Error {
  grpcCode: GrpcStatusCode;

  result?: unknown;

  constructor(message: string, grpcCode: GrpcStatusCode, result?: unknown) {
    super(message);
    this.name = 'PipelineApiError';
    this.grpcCode = grpcCode;
    this.result = result;
  }
}

const isErrorKF = (e: unknown): e is ErrorKF =>
  typeof e === 'object' && e !== null && ['error', 'code', 'message'].every((key) => key in e);

type GrpcErrorKF = {
  code: number;
  message: string;
  details?: unknown[];
};

const isGrpcErrorKF = (e: unknown): e is GrpcErrorKF => {
  if (typeof e !== 'object' || e === null || !('code' in e) || !('message' in e)) {
    return false;
  }
  const obj: Record<string, unknown> = e;
  return (
    typeof obj.code === 'number' &&
    obj.code !== 0 &&
    typeof obj.message === 'string' &&
    !('error' in e) &&
    !('run_id' in e) &&
    !('recurring_run_id' in e)
  );
};

const isErrorDetailsKF = (result: unknown): result is ResultErrorKF =>
  typeof result === 'object' &&
  result !== null &&
  ['error_details', 'error_message'].every((key) => key in result);

export const handlePipelineFailures = <T>(promise: Promise<T>): Promise<T> =>
  promise
    .then((result) => {
      if (isErrorKF(result) || isGrpcErrorKF(result)) {
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
        throw new Error(e.error);
      }
      if (isGrpcErrorKF(e)) {
        throw new GrpcError(e.message, e.code, e);
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

      if (e instanceof Error) {
        throw e;
      }

      // eslint-disable-next-line no-console
      console.error('Unknown pipeline API error', e);
      throw new Error('Error communicating with pipeline server');
    });
