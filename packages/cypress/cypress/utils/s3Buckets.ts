import type { AWSS3Buckets } from '../types';

export const AWS_BUCKETS: AWSS3Buckets = Cypress.env('AWS_PIPELINES');

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
