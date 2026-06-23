export const containsOnlySlashes = (inputString: string): boolean => /^\/+$/.test(inputString);

const containsMultipleSlashesPattern = (inputString: string): boolean => /\/{2,}/.test(inputString);

/**
 * Alphanumeric characters, hyphens (-), underscores (_), periods (.), and slashes (/) are generally allowed.
 */
export const isS3PathValid = (path: string): boolean => {
  const pattern = /^[a-zA-Z0-9\-_./]+$/;
  return pattern.test(path) && !containsMultipleSlashesPattern(path);
};
