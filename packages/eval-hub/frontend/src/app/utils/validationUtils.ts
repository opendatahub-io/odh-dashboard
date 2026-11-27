import type { SourceMode } from '~/app/types';

// S3 bucket naming rules: 3-63 characters of lowercase letters, numbers, dots, and hyphens
export const S3_BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const getUrlValidationError = (url: string): string | undefined => {
  if (url.trim() === '') {
    return 'Endpoint URL is required.';
  }
  if (!/^https?:\/\//i.test(url.trim())) {
    return 'Endpoint URL must start with http:// or https://.';
  }
  if (!isValidUrl(url.trim())) {
    return 'Invalid URL format.';
  }
  return undefined;
};

const isClusterLocalServiceHost = (hostname: string): boolean =>
  hostname.toLowerCase().endsWith('.svc.cluster.local');

export const getGenerationModelUrlValidationError = (url: string): string | undefined => {
  const basicError = getUrlValidationError(url);
  if (basicError) {
    return basicError;
  }
  const parsed = new URL(url.trim());
  if (parsed.username || parsed.password) {
    return 'Endpoint URL must not contain embedded credentials; use a secret reference.';
  }
  if (parsed.protocol === 'http:' && !isClusterLocalServiceHost(parsed.hostname)) {
    return 'External recommendation model endpoints must use HTTPS.';
  }
  return undefined;
};

export const RECOGNIZED_CONNECTION_ERROR_CODES = new Set([
  'CONNECTION_FAILED',
  'TIMEOUT',
  'UNAUTHORIZED',
  'FORBIDDEN',
]);

export const getUserFriendlyConnectionError = (
  errorCode: string | undefined,
  sourceMode: SourceMode,
): string => {
  switch (errorCode) {
    case 'CONNECTION_FAILED':
      return 'Could not reach endpoint. Check the URL and network connectivity.';
    case 'TIMEOUT':
      return 'Connection timed out. The endpoint is not responding.';
    case 'UNAUTHORIZED':
      return sourceMode === 'prerecorded'
        ? 'Authentication failed \u2014 check the access token.'
        : 'Authentication failed \u2014 check the API key.';
    case 'FORBIDDEN':
      return 'Access denied \u2014 insufficient permissions.';
    default:
      return 'Connection verification failed.';
  }
};
