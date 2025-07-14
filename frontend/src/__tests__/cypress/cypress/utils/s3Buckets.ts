import type { AWSS3Buckets } from '#~/__tests__/cypress/cypress/types';

export const AWS_BUCKETS: AWSS3Buckets = Cypress.env('AWS_PIPELINES');
