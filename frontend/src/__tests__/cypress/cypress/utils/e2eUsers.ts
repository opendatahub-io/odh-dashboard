import type { UserAuthConfig } from '~/__tests__/cypress/cypress/types';

export const TEST_USER: UserAuthConfig = Cypress.env('TEST_USER');
export const ADMIN_USER: UserAuthConfig = Cypress.env('ADMIN_USER');
