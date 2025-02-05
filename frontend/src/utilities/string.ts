export const genRandomChars = (len = 6): string =>
  Math.random()
    .toString(36)
    .replace(/[^a-z0-9]+/g, '')
    .substr(1, len);

export const downloadString = (filename: string, data: string): void => {
  const element = document.createElement('a');
  const file = new Blob([data], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const triggerFileDownload = (filename: string, href: string): void => {
  const element = document.createElement('a');
  element.href = href;
  element.download = filename;
  element.target = '_blank';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

/**
 * This function removes the leading slash (/) from string if exists
 */
export const removeLeadingSlash = (inputString: string): string => inputString.replace(/^\//, '');

/**
 * Function to check if string only contains slashes
 */
export const containsOnlySlashes = (inputString: string): boolean => /^\/+$/.test(inputString);

/**
 * Function to check if string contains multiple slashes consecutively
 */
export const containsMultipleSlashesPattern = (inputString: string): boolean =>
  /\/{2,}/.test(inputString);

/**
 * Function to check if s3 path is valid
 * Alphanumeric characters, hyphens (-), underscores (_), periods (.), and slashes (/) are generally allowed.
 */
export const isS3PathValid = (path: string): boolean => {
  const pattern = /^[a-zA-Z0-9\-_./]+$/;
  return pattern.test(path) && !containsMultipleSlashesPattern(path);
};

/*
 * Truncates a string to a specified number of characters with ellipses
 */
export const truncateString = (str: string, length: number): string => {
  if (str.length <= length) {
    return str;
  }
  return `${str.substring(0, length)}…`;
};

export const joinWithCommaAnd = (
  items: string[],
  options?: {
    singlePrefix?: string;
    singleSuffix?: string;
    multiPrefix?: string;
    multiSuffix?: string;
  },
  joinWord = 'and',
): string =>
  items.length > 1
    ? `${options?.multiPrefix ?? ''}${items
        .slice(0, items.length - 1)
        .map((i) => i)
        .join(', ')}${items.length > 2 ? ',' : ''} ${joinWord} ${items[items.length - 1]}${
        options?.multiSuffix ?? ''
      }`
    : `${options?.singlePrefix ?? ''}${items[0]}${options?.singleSuffix ?? ''}`;
