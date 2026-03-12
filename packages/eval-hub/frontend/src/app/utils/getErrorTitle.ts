const ERROR_TITLE_MATCHERS: [RegExp, string][] = [
  [/unauthorized|auth_token/i, 'Authentication failed'],
  [/forbidden|access/i, 'Access denied'],
  [/not_found|not found/i, 'Resource not found'],
  [/invalid|bad request/i, 'Invalid request'],
  [/connection|unavailable/i, 'Service unavailable'],
];

const getErrorTitle = (error: unknown, fallback: string): string => {
  const message = error instanceof Error ? error.message : '';
  const match = ERROR_TITLE_MATCHERS.find(([pattern]) => pattern.test(message));
  return match ? match[1] : fallback;
};

export default getErrorTitle;
