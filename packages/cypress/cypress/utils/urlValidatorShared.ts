/**
 * Shared URL validation constants and utilities
 *
 * This module contains browser-safe code that can be imported by test files.
 * Node.js-specific HTTP validation logic is in urlValidator.ts (Cypress task only).
 */

// Valid HTTP status codes for URL validation
export const VALID_STATUS_CODES = new Set([
  200,
  201,
  202,
  203,
  204,
  205,
  206,
  207,
  208,
  226, // 2xx Success
  300,
  301,
  302,
  303,
  304,
  305,
  306,
  307,
  308, // 3xx Redirection
]);

// Transient error codes (temporary failures - may succeed on retry)
export const TRANSIENT_ERROR_CODES = new Set([
  429, // Too Many Requests (rate limiting)
  502, // Bad Gateway (upstream server issue)
  503, // Service Unavailable (temporary overload)
  504, // Gateway Timeout (upstream timeout)
]);

// Permanent error codes (validation failures)
export const PERMANENT_ERROR_CODES = new Set([
  400, // Bad Request
  401, // Unauthorized
  403, // Forbidden
  404, // Not Found
  405, // Method Not Allowed
  406, // Not Acceptable
  407, // Proxy Authentication Required
  408, // Request Timeout
  409, // Conflict
  410, // Gone
  411, // Length Required
  412, // Precondition Failed
  413, // Payload Too Large
  414, // URI Too Long
  415, // Unsupported Media Type
  416, // Range Not Satisfiable
  417, // Expectation Failed
  418, // I'm a teapot
  421, // Misdirected Request
  422, // Unprocessable Entity
  423, // Locked
  424, // Failed Dependency
  425, // Too Early
  426, // Upgrade Required
  428, // Precondition Required
  431, // Request Header Fields Too Large
  451, // Unavailable For Legal Reasons
  500, // Internal Server Error
  501, // Not Implemented
  505, // HTTP Version Not Supported
  506, // Variant Also Negotiates
  507, // Insufficient Storage
  508, // Loop Detected
  510, // Not Extended
  511, // Network Authentication Required
]);

/**
 * Categorize error based on status code or error type
 */
export const getErrorType = (
  status: number,
  error?: string,
): 'valid' | 'transient' | 'permanent' => {
  if (VALID_STATUS_CODES.has(status)) {
    return 'valid';
  }
  if (TRANSIENT_ERROR_CODES.has(status)) {
    return 'transient';
  }
  if (PERMANENT_ERROR_CODES.has(status)) {
    return 'permanent';
  }

  // Network errors are generally transient (DNS, connection issues)
  if (error) {
    const lowerError = error.toLowerCase();
    if (
      lowerError.includes('timeout') ||
      lowerError.includes('econnrefused') ||
      lowerError.includes('enotfound') ||
      lowerError.includes('enetunreach') ||
      lowerError.includes('ehostunreach') ||
      lowerError.includes('econnreset') ||
      lowerError.includes('socket hang up')
    ) {
      return 'transient';
    }
  }

  return 'permanent';
};

/**
 * Validate URL format (fast, no network request)
 */
export const validateUrlFormat = (url: string): { valid: boolean; error?: string; url: string } => {
  try {
    const parsedUrl = new URL(url);

    // Check for HTTPS (we only validate HTTPS URLs)
    if (parsedUrl.protocol !== 'https:') {
      return {
        valid: false,
        error: `Non-HTTPS URL: ${parsedUrl.protocol}`,
        url,
      };
    }

    // Check for localhost
    if (
      parsedUrl.hostname === 'localhost' ||
      parsedUrl.hostname === '127.0.0.1' ||
      parsedUrl.hostname === '::1'
    ) {
      return {
        valid: false,
        error: 'Localhost URL not allowed in manifests',
        url,
      };
    }

    // Check for template variables
    if (url.includes('${') || url.includes('<') || url.includes('>')) {
      return {
        valid: false,
        error: 'URL contains template variables or placeholders',
        url,
      };
    }

    return { valid: true, url };
  } catch (error: unknown) {
    return {
      valid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : String(error)}`,
      url,
    };
  }
};
