/**
 * Function to check if string only contains slashes
 */
export const containsOnlySlashes = (inputString: string): boolean => /^\/+$/.test(inputString);

/**
 * Function to check if string contains multiple slashes consecutively
 */
const containsMultipleSlashesPattern = (inputString: string): boolean => /\/{2,}/.test(inputString);

/**
 * Function to check if s3 path is valid
 * Alphanumeric characters, hyphens (-), underscores (_), periods (.), and slashes (/) are generally allowed.
 */
export const isS3PathValid = (path: string): boolean => {
  const pattern = /^[a-zA-Z0-9\-_./]+$/;
  return pattern.test(path) && !containsMultipleSlashesPattern(path);
};
