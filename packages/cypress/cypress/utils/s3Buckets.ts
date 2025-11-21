import type { AWSS3Buckets } from '../types';

export const AWS_BUCKETS: AWSS3Buckets = Cypress.env('AWS_PIPELINES');
