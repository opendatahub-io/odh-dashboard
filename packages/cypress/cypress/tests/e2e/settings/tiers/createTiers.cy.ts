import {
  tiersPage,
  createTierPage,
  tierDetailsPage,
  deleteTierModal,
} from '../../../../pages/modelsAsAService';
import { htpasswd } from '../../../../utils/e2eUsers';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '../../../../pages/modelServing';

describe('Verify Tiers Creation', () => {
  it(
    'Verify Tiers Creation',
    {
      tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@Tiers'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', htpasswd);

      cy.step('Navigate to Tiers page');
      tiersPage.visit();

      cy.step('Create a new tier');
      tiersPage.findCreateTierButton().click();
      createTierPage.findNameInput().type('cypress E2E Test Tier');
      createTierPage.findDescriptionInput().type('cypress E2E Test tier description');
      createTierPage.selectGroupsOption('premium-users');
      createTierPage.selectGroupsOption('all-users');
      createTierPage.findTokenRateLimitCheckbox().click();
      createTierPage.findTokenRateLimitCountInput(0).clear().type('500');
      createTierPage.findTokenRateLimitTimeInput(0).clear().type('5');
      createTierPage.selectTokenRateLimitUnit(0, 'hour');
      createTierPage.findRequestRateLimitCheckbox().click();
      createTierPage.findRequestRateLimitCountInput(0).clear().type('200');
      createTierPage.findRequestRateLimitTimeInput(0).clear().type('3');
      createTierPage.selectRequestRateLimitUnit(0, 'second');
      createTierPage.findCreateButton().should('exist').should('be.enabled').click();

      cy.step('Verify the tier is created');
      tiersPage.findRows().contains('cypress E2E Test Tier').should('exist');

      cy.step('View the tiers details');
      tiersPage.findKebab('cypress E2E Test Tier').click();
      tiersPage.findViewDetailsButton().click();

      tiersPage.findTitle().should('contain.text', 'cypress E2E Test Tier');
      //tierDetailsPage.findLevel().should('not.be.empty');
      tierDetailsPage.findGroups().should('contain.text', 'all-users');
      tierDetailsPage.findLimits('500 tokens per 5 hour').should('exist');
      tierDetailsPage.findLimits('200 requests per 3 second').should('exist');

      cy.step('Edit the tier');
      tierDetailsPage.findActionsButton().click();
      tierDetailsPage.findActionsEditButton().should('exist').click();
      createTierPage.selectGroupsOption('system:authenticated');
      createTierPage.findUpdateButton().should('be.enabled').click();

      cy.step('Verify the tier is edited');
      const tierRow = tiersPage.getRow('cypress E2E Test Tier');
      tierRow.findName().should('contain.text', 'cypress E2E Test Tier');
      //tierRow.findLevel().should('not.be.empty');
      tierRow.findGroups().should('contain.text', '3 Groups');
      tierRow.findLimits().should('contain.text', '500 tokens per 5 hour');
      tierRow.findLimits().should('contain.text', '200 requests per 3 second');

      cy.step('Deploy model with this test Resource Tier');
      modelServingGlobal.visit('test-project');
      modelServingGlobal.findDeployModelButton().click();
      cy.step('Delete the tier');
      tierRow.findDeleteButton().click();
      deleteTierModal.findInput().type('cypress E2E Test Tier');
      deleteTierModal.findSubmitButton().click();

      cy.step('Verify the tier is deleted');
      tiersPage.findRows().contains('cypress E2E Test Tier').should('not.exist');
    },
  );
});
