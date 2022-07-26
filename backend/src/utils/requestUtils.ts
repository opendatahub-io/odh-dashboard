import createError from 'http-errors';

export const createCustomError = (title: string, message: string): createError.HttpError<500> => {
  const error = createError(500, title);
  error.explicitInternalServerError = true;
  error.error = title;
  error.message = message;
  return error;
};
