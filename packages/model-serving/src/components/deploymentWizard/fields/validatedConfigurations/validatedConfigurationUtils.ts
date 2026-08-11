/**
 * Formats a validated configuration option value for display in the "View arguments" popover.
 * Normalizes line-continuation backslashes while preserving individual CLI arguments.
 */
export const formatValidatedOptionValueForDisplay = (value: string): string =>
  value
    .split('\n')
    .map((line) => line.replace(/\\$/, '').trim())
    .filter(Boolean)
    .join(' \\\n');

export const slugifyValidatedOptionTitle = (title: string): string =>
  title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
