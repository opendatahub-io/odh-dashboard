import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { tiersPage } from '../../../pages/modelsAsAService';

describe('Tiers Page', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelAsService: true,
      }),
    );

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
    freeTierRow.findModels().should('contain.text', '3 Models');
    freeTierRow.findLimits().should('contain.text', '10,000 tokens/hr');
    freeTierRow.findLimits().should('contain.text', '100 requests/min');

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
});
