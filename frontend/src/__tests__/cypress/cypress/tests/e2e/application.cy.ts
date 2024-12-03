import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';

describe('application', { testIsolation: false }, () => {
  it('should login and load page', () => {
    cy.visitWithLogin('/');
    cy.findByRole('banner', { name: 'page masthead' }).contains('Force failure');
  });
});
