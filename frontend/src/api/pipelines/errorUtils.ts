import { isCommonStateError } from '#~/utilities/useFetchState';

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

const isErrorKF = (e: unknown): e is ErrorKF =>
  typeof e === 'object' && e !== null && ['error', 'code', 'message'].every((key) => key in e);

const isErrorDetailsKF = (result: unknown): result is ResultErrorKF =>
  typeof result === 'object' &&
  result !== null &&
  ['error_details', 'error_message'].every((key) => key in result);

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
        throw new Error(e.error);
      }
      if (isCommonStateError(e)) {
        // Common state errors are handled by useFetchState at storage level, let them deal with it
        throw e;
      }

      // eslint-disable-next-line no-console
      console.error('Unknown pipeline API error', e);
      throw new Error('Error communicating with pipeline server');
    });
