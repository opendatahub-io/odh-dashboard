import type { AWSS3Buckets } from '../types';

export const AWS_BUCKETS: AWSS3Buckets = Cypress.env('AWS_PIPELINES');

export const parseS3Endpoint = (endpoint: string): { host: string; scheme: string } => {
  try {
    const url = new URL(endpoint);
    return { host: url.host, scheme: url.protocol.replace(':', '') };
  } catch {
    return { host: endpoint.replace(/\/+$/, ''), scheme: 'https' };
  }
};
