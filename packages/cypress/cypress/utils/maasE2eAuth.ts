import type { UserAuthConfig } from '../types';

const isE2eProxyLoginEnabled = (): boolean => {
  if (Cypress.env('E2E_PROXY')) {
    return true;
  }
  try {
    return new URL(Cypress.config('baseUrl') || '').port === '4040';
  } catch {
    return false;
  }
};

/** Verifies the E2E proxy session matches the expected user (GET /e2e-login). */
export const assertE2eLoggedInAs = (credentials: UserAuthConfig): void => {
  if (!isE2eProxyLoginEnabled()) {
    cy.log(`Skipping E2E session assertion for ${credentials.USERNAME} (E2E proxy is not active)`);
    return;
  }

  cy.request('GET', '/e2e-login').its('body.username').should('eq', credentials.USERNAME);
};
