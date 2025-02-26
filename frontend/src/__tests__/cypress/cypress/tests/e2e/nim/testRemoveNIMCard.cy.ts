import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';
import { patchOpenShiftNSResource } from '../../../utils/oc_commands/baseCommands';

describe('Verify RHODS Explore Section Contains NIM card and verify card body', () => {
  it('Enable and validate NIM flow', () => {
    // use oc client to set odhDashboard disableNIMModelServing to false
    patchOpenShiftNSResource(
      'secrets',
      'nvidia-nim-access',
      '[{"op": "replace", "path": "/data/api_key", "value": "bm90IGEgdmFsaWQga2V5"}]',
      'redhat-ods-applications',
      'json',
    );
    // Authentication and navigation
    cy.step('Login to the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    enabledPage.visit();
    cy.findByTestId('card nvidia-nim').contains(
      'NVIDIA NIM is a set of easy-to-use microservices designed for secure, reliable deployment of high-performance AI model inferencing.',
    );
    cy.findByTestId('card nvidia-nim').within(() => {
      cy.contains('button', 'Disabled', { timeout: 60000 }).click();
    });
    cy.get('.pf-v6-c-popover__body').within(() => {
      cy.get('button:contains("here")').eq(1).click();
    });
    enabledPage.visit();
    cy.findByTestId('card nvidia-nim').should('not.exist');
  });
});