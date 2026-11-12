import {
  isValidUrl,
  getUrlValidationError,
  getUserFriendlyConnectionError,
  RECOGNIZED_CONNECTION_ERROR_CODES,
} from '~/app/utils/validationUtils';

describe('isValidUrl', () => {
  it('should accept http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('should accept https URLs', () => {
    expect(isValidUrl('https://api.example.com/v1')).toBe(true);
  });

  it('should accept URLs with ports', () => {
    expect(isValidUrl('http://localhost:8080/v1')).toBe(true);
  });

  it('should reject ftp scheme', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
  });

  it('should reject malformed URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });
});

describe('getUrlValidationError', () => {
  it('should return required error for empty string', () => {
    expect(getUrlValidationError('')).toBe('Endpoint URL is required.');
  });

  it('should return required error for whitespace-only string', () => {
    expect(getUrlValidationError('   ')).toBe('Endpoint URL is required.');
  });

  it('should return scheme error for URLs without http/https', () => {
    expect(getUrlValidationError('example.com')).toBe(
      'Endpoint URL must start with http:// or https://.',
    );
  });

  it('should return scheme error for ftp URLs', () => {
    expect(getUrlValidationError('ftp://example.com')).toBe(
      'Endpoint URL must start with http:// or https://.',
    );
  });

  it('should return undefined for valid http URL', () => {
    expect(getUrlValidationError('http://example.com')).toBeUndefined();
  });

  it('should return undefined for valid https URL', () => {
    expect(getUrlValidationError('https://api.example.com/v1')).toBeUndefined();
  });

  it('should return undefined for cluster-internal URLs', () => {
    expect(
      getUrlValidationError('http://model-predictor.ns.svc.cluster.local:8080/v1'),
    ).toBeUndefined();
  });
});

describe('getUserFriendlyConnectionError', () => {
  it('should return connection error message for CONNECTION_FAILED', () => {
    expect(getUserFriendlyConnectionError('CONNECTION_FAILED', 'model')).toBe(
      'Could not reach endpoint. Check the URL and network connectivity.',
    );
  });

  it('should return timeout message for TIMEOUT', () => {
    expect(getUserFriendlyConnectionError('TIMEOUT', 'agent')).toBe(
      'Connection timed out. The endpoint is not responding.',
    );
  });

  it('should return API key message for UNAUTHORIZED with model source', () => {
    expect(getUserFriendlyConnectionError('UNAUTHORIZED', 'model')).toContain('API key');
  });

  it('should return access token message for UNAUTHORIZED with prerecorded source', () => {
    expect(getUserFriendlyConnectionError('UNAUTHORIZED', 'prerecorded')).toContain('access token');
  });

  it('should return forbidden message for FORBIDDEN', () => {
    expect(getUserFriendlyConnectionError('FORBIDDEN', 'model')).toBe(
      'Access denied \u2014 insufficient permissions.',
    );
  });

  it('should return generic message for unknown error code', () => {
    expect(getUserFriendlyConnectionError('UNKNOWN', 'model')).toBe(
      'Connection verification failed.',
    );
  });

  it('should return generic message for undefined error code', () => {
    expect(getUserFriendlyConnectionError(undefined, 'model')).toBe(
      'Connection verification failed.',
    );
  });

  it('should return generic message for unrecognized error codes regardless of server context', () => {
    expect(getUserFriendlyConnectionError('SECRET_NOT_FOUND', 'model')).toBe(
      'Connection verification failed.',
    );
  });

  it('should recognize all codes in RECOGNIZED_CONNECTION_ERROR_CODES', () => {
    for (const code of RECOGNIZED_CONNECTION_ERROR_CODES) {
      expect(getUserFriendlyConnectionError(code, 'model')).not.toBe(
        'Connection verification failed.',
      );
    }
  });
});
