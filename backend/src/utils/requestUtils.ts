import createError from 'http-errors';

export const createCustomError = (
  title: string,
  message: string,
  code = 500,
): createError.HttpError => {
  const error = createError(code, title);
  error.code = code;
  error.explicitInternalServerError = code >= 500;
  error.error = title;
  error.message = message;
  return error;
};

export function promiseWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutError = new Error('Promise timed out'),
): Promise<T> {
  // create a promise that rejects in milliseconds
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError);
    }, ms);
  });

  return Promise.race<T>([promise, timeout]);
}
