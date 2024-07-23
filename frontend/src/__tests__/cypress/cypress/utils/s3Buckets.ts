import type { AWSS3Bucket } from '~/__tests__/cypress/cypress/types';

export const AWS_PIPELINES_BUCKET: AWSS3Bucket = Cypress.env('AWS_PIPELINES_BUCKET');
