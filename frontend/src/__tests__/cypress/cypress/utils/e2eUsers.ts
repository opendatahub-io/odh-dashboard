import type { UserAuthConfig } from '~/__tests__/cypress/cypress/types';

export const LDAP_CONTRIBUTOR_USER: UserAuthConfig = Cypress.env('LDAP_CONTRIBUTOR_USER');
export const HTPASSWD_CLUSTER_ADMIN_USER: UserAuthConfig = Cypress.env(
  'HTPASSWD_CLUSTER_ADMIN_USER',
);
