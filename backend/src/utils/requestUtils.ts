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
