import type { UserAuthConfig } from '~/__tests__/cypress/cypress/types';

export const CONTRIBUTOR_USER: UserAuthConfig = Cypress.env('CONTRIBUTOR_USER');
export const ADMIN_USER: UserAuthConfig = Cypress.env('ADMIN_USER');
