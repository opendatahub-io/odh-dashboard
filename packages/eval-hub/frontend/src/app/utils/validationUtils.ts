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
