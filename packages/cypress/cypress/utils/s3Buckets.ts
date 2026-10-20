import type { AWSS3Buckets } from '../types';

export const AWS_BUCKETS: AWSS3Buckets = Cypress.env('AWS_PIPELINES');

/**
 * Resolve the S3 endpoint used by AutoX pipeline resources.
 *
 * Disconnected clusters provide an in-cluster MinIO endpoint through
 * DSPA_S3_ENDPOINT so pipeline pods and the AutoX BFF avoid the external route.
 * Connected clusters retain the endpoint configured for the selected bucket.
 */
export const resolveAutoXS3Endpoint = (bucketEndpoint: string): string => {
  const configuredEndpoint = Cypress.env('DSPA_S3_ENDPOINT');
  if (typeof configuredEndpoint === 'string' && configuredEndpoint.trim()) {
    return configuredEndpoint.trim();
  }
  return bucketEndpoint;
};

export const parseS3Endpoint = (endpoint: string): { host: string; scheme: string } => {
  const normalized = /^https?:\/\//.test(endpoint) ? endpoint : `https://${endpoint}`;
  try {
    const url = new URL(normalized);
    if (url.host && (url.protocol === 'http:' || url.protocol === 'https:')) {
      return { host: url.host, scheme: url.protocol.replace(':', '') };
    }
  } catch {
    // Fall through to the host/https fallback.
  }
  return { host: endpoint.replace(/\/+$/, ''), scheme: 'https' };
};
