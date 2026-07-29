import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { agentsCatalogPage, agentDetailsPage } from '../../../pages/agentsCatalog';
import {
  verifyAgentsCatalogBackend,
  ensureAgentsCatalogSourceEnabled,
  waitForAgentsCatalogCards,
} from '../../../utils/oc_commands/agentsCatalog';
import { retryableBefore } from '../../../utils/retryableHooks';

describe('Verifies that Agents Catalog is available and navigable', () => {
  let testData: Record<string, string>;

  retryableBefore(() => {
    return cy
      .fixture('e2e/agentsCatalog/testAgentsCatalog.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as Record<string, string>;

        cy.step('Verify Agents Catalog backend is deployed and source exists');
        verifyAgentsCatalogBackend(testData.agentsSourceId);

        cy.step('Ensure agents catalog source is enabled');
        return ensureAgentsCatalogSourceEnabled(testData.agentsSourceId);
      });
  });

  it(
    'Verifies Agents Catalog is available and navigable for an admin user',
    { tags: ['@FeatureFlagged', '@Dashboard', '@AgentsCatalog'] },
    () => {
      cy.step('Login as admin user with agentsCatalog feature flag enabled');
      cy.visitWithLogin('/?devFeatureFlags=agentsCatalog=true', LDAP_ADMIN_USER);

      cy.step('Navigate to Agents Catalog');
      agentsCatalogPage.navigate();

      cy.step('Verify Agents Catalog page title is present');
      agentsCatalogPage.findPageTitle().should('exist');

      cy.step('Wait for agent cards to appear');
      waitForAgentsCatalogCards();

      cy.step('Verify at least one agent card is rendered');
      agentsCatalogPage.findAgentsCatalogCards().should('have.length.at.least', 1);

      cy.step('Click the first agent card detail link');
      agentsCatalogPage.findFirstAgentCardDetailLink().should('be.visible').click();

      cy.step('Verify agent details page - breadcrumb and agent name visible');
      agentDetailsPage.findBreadcrumbAgentName().should('exist').and('not.be.empty');

      cy.step('Verify agent details overview content is displayed');
      agentDetailsPage.findAgentDescription().should('exist');

      cy.step('Click breadcrumb to navigate back to catalog gallery');
      agentDetailsPage.findBreadcrumbCatalogLink().click();

      cy.step('Verify agent cards are still visible after returning');
      agentsCatalogPage.findAgentsCatalogCards().should('have.length.at.least', 1);
    },
  );

  it(
    'Verifies Agents Catalog is available and navigable for a regular user',
    { tags: ['@FeatureFlagged', '@Dashboard', '@AgentsCatalog'] },
    () => {
      cy.step('Login as contributor user with agentsCatalog feature flag enabled');
      cy.visitWithLogin('/?devFeatureFlags=agentsCatalog=true', LDAP_CONTRIBUTOR_USER);

      cy.step('Navigate to Agents Catalog');
      agentsCatalogPage.navigate();

      cy.step('Verify Agents Catalog page title is present');
      agentsCatalogPage.findPageTitle().should('exist');

      cy.step('Wait for agent cards to appear');
      waitForAgentsCatalogCards();

      cy.step('Verify at least one agent card is rendered');
      agentsCatalogPage.findAgentsCatalogCards().should('have.length.at.least', 1);

      cy.step('Click the first agent card detail link');
      agentsCatalogPage.findFirstAgentCardDetailLink().should('be.visible').click();

      cy.step('Verify agent details page - breadcrumb and agent name visible');
      agentDetailsPage.findBreadcrumbAgentName().should('exist').and('not.be.empty');
    },
  );
});
