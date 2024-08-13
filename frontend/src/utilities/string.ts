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
 * This function replaces the first occurrence of a numeric part in the input string
 * with the specified replacement numeric value.
 * @param inputString
 * @param replacementString
 */
export const replaceNumericPartWithString = (
  inputString: string,
  replacementString: number,
): string => {
  // If the input string is empty or contains only whitespace, return the replacement as a string.
  if (inputString.trim() === '') {
    return replacementString.toString();
  }

  const match = inputString.match(/\d+/); //Find numeric part in string (only first occurance)
  let updatedString = inputString;

  if (match) {
    const matchedNumber = match[0];
    updatedString = inputString.replace(matchedNumber, String(replacementString));
  } else {
    // If no numeric part is found, prepend the replacement numeric value to the input string.
    updatedString = replacementString + inputString;
  }
  return updatedString;
};

/**
 * This function replaces the first occurrence of a non-numeric part in the input string
 * with the specified replacement string.
 * @param inputString
 * @param replacementString
 */
export const replaceNonNumericPartWithString = (
  inputString: string,
  replacementString: string,
): string => {
  if (inputString.trim() === '') {
    return replacementString;
  }

  const match = inputString.match(/\D+/); //Find non-numeric part in string (only first occurance)
  let updatedString = inputString;

  if (match) {
    const matchedString = match[0];
    updatedString = inputString.replace(matchedString, replacementString);
  } else {
    // If no non-numeric part is found, append the replacement non-numeric value to the input string.
    updatedString = inputString + replacementString;
  }
  return updatedString;
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
