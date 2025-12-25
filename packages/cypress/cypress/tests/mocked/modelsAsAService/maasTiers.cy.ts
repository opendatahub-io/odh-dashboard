import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { createTierPage, deleteTierModal, tiersPage } from '../../../pages/modelsAsAService';
import { mockTiers } from '../../../utils/maasUtils';

describe('Tiers Page', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelAsService: true,
      }),
    );
    cy.intercept('GET', '/api/tiers', mockTiers);

    cy.interceptOdh('GET /maas/api/v1/tiers', {
      data: mockTiers(),
    });

    tiersPage.visit();
  });

  it('should display the tiers page', () => {
    tiersPage.findTitle().should('contain.text', 'Tiers');
    tiersPage
      .findDescription()
      .should(
        'contain.text',
        'Tiers control which AI asset model endpoints users can access based on their group membership.',
      );

    tiersPage.findTable().should('exist');
    tiersPage.findRows().should('have.length', 3);

    const freeTierRow = tiersPage.getRow('Free Tier');
    freeTierRow.findName().should('contain.text', 'Free Tier');
    freeTierRow.findLevel().should('contain.text', '1');
    freeTierRow.findGroups().should('contain.text', '1 Group');
    freeTierRow.findLimits().should('contain.text', '10,000 tokens/1 hour');
    freeTierRow.findLimits().should('contain.text', '100 requests/1 minute');

    // filter by tier name
    tiersPage.findFilterInput().type('Premium');
    tiersPage.findRows().should('have.length', 1);
    tiersPage.getRow('Premium Tier').findName().should('contain.text', 'Premium Tier');

    tiersPage.findFilterResetButton().click();
    tiersPage.findRows().should('have.length', 3);

    // filter by tier description
    tiersPage.findFilterInput().type('enterprise');
    tiersPage.findRows().should('have.length', 1);
    tiersPage.getRow('Enterprise Tier').findName().should('contain.text', 'Enterprise Tier');
    tiersPage.findFilterResetButton().click();

    // show empty state when filter has no matches
    tiersPage.findFilterInput().type('nonexistent-tier');
    tiersPage.findEmptyState().should('exist');

    // clear filter
    tiersPage.findFilterResetButton().click();
    tiersPage.findRows().should('have.length', 3);
  });

  it('should create a new tier', () => {
    tiersPage.findCreateTierButton().click();
    createTierPage.findTitle().should('contain.text', 'Create tier');
    createTierPage
      .findPageDescription()
      .should(
        'contain.text',
        'Create a new tier to control which models users can access based on their group membership.',
      );

    createTierPage.findCreateButton().should('exist').should('be.disabled');

    createTierPage.findNameInput().type('Test Tier');
    createTierPage.findDescriptionInput().type('Test tier description');
    createTierPage.findLevelInput().type('5');
    createTierPage.selectGroupsOption('premium-users');
    createTierPage.findTokenRateLimitCheckbox().click();
    createTierPage.findTokenRateLimitCountInput(0).type('500');
    createTierPage.findTokenRateLimitTimeInput(0).type('5');
    createTierPage.selectTokenRateLimitUnit(0, 'hour');
    createTierPage.findRequestRateLimitCheckbox().click();
    createTierPage.findRequestRateLimitCountInput(0).type('200');
    createTierPage.findRequestRateLimitTimeInput(0).type('3');
    createTierPage.selectRequestRateLimitUnit(0, 'second');
    createTierPage.findCreateButton().should('exist').should('be.enabled').click();

    tiersPage.findTable().should('exist');
  });

  it('should delete a tier', () => {
    tiersPage.getRow('Free Tier').findDeleteButton().click();
    deleteTierModal.findInput().type('free');
    deleteTierModal.findSubmitButton().click();
  });

  it('should edit a tier', () => {
    //cy.intercept('GET', '/api/tiers/enterprise-tier', mockTiers()[2]);

    tiersPage.getRow('Enterprise Tier').findKebabAction('Edit tier').click();
    createTierPage.findTitle().should('contain.text', 'Edit tier');
    createTierPage
      .findPageDescription()
      .should(
        'contain.text',
        'Edit a tier to control which models users can access based on their group membership.',
      );

    createTierPage.findNameInput().should('have.value', 'Enterprise Tier');
    createTierPage.findDescriptionInput().should('have.value', 'Unlimited enterprise access');
    createTierPage.findLevelInput().should('have.value', '3');
    createTierPage.findGroupsSelectButton().click();
    createTierPage
      .findGroupsOption('enterprise-users')
      .should('have.attr', 'aria-selected', 'true');
    createTierPage.findTokenRateLimitCheckbox().should('be.checked');
    createTierPage.findTokenRateLimitCountInput(0).should('have.value', '1000000');
    createTierPage.findTokenRateLimitTimeInput(0).should('have.value', '1');
    createTierPage.findTokenRateLimitUnitSelect(0).should('contain.text', 'hour');
    createTierPage.findRequestRateLimitCheckbox().should('be.checked');
    createTierPage.findRequestRateLimitCountInput(0).should('have.value', '10000');
    createTierPage.findRequestRateLimitTimeInput(0).should('have.value', '1');
    createTierPage.findRequestRateLimitUnitSelect(0).should('contain.text', 'minute');
    createTierPage.findUpdateButton().should('exist').should('be.enabled').click();

    tiersPage.findTable().should('exist');
  });
});
