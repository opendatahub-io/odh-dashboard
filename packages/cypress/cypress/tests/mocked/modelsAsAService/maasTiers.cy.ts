import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  createTierPage,
  deleteTierModal,
  tierDetailsPage,
  tiersPage,
} from '../../../pages/modelsAsAService';
import { mockTier, mockTiers } from '../../../utils/maasUtils';

describe('Tiers Page', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelAsService: true,
        genAiStudio: true,
      }),
    );

    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
        },
      }),
    );

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
    cy.interceptOdh('POST /maas/api/v1/tier', {
      data: mockTier({
        name: 'test-tier',
        displayName: 'Test Tier',
        description: 'Test tier description',
        level: 5,
        groups: ['premium-users'],
        limits: {
          tokensPerUnit: [{ count: 500, time: 5, unit: 'hour' }],
          requestsPerUnit: [{ count: 200, time: 3, unit: 'second' }],
        },
      }),
    }).as('createTier');

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
    createTierPage.findLevelInput().clear().type('5');
    createTierPage.selectGroupsOption('premium-users');
    createTierPage.findTokenRateLimitCheckbox().click();
    createTierPage.findTokenRateLimitCountInput(0).clear().type('500');
    createTierPage.findTokenRateLimitTimeInput(0).clear().type('5');
    createTierPage.selectTokenRateLimitUnit(0, 'hour');
    createTierPage.findRequestRateLimitCheckbox().click();
    createTierPage.findRequestRateLimitCountInput(0).clear().type('200');
    createTierPage.findRequestRateLimitTimeInput(0).clear().type('3');
    createTierPage.selectRequestRateLimitUnit(0, 'second');
    createTierPage.findCreateButton().should('exist').should('be.enabled').click();

    cy.wait('@createTier').then((interception) => {
      expect(interception.request.body.data).to.deep.include({
        name: 'test-tier',
        displayName: 'Test Tier',
        description: 'Test tier description',
        level: 5,
        groups: ['premium-users'],
      });
      expect(interception.request.body.data.limits.tokensPerUnit).to.deep.equal([
        { count: 500, time: 5, unit: 'hour' },
      ]);
      expect(interception.request.body.data.limits.requestsPerUnit).to.deep.equal([
        { count: 200, time: 3, unit: 'second' },
      ]);
    });
    cy.interceptOdh('GET /maas/api/v1/tiers', {
      data: mockTiers().concat(
        mockTier({
          name: 'test-tier',
          displayName: 'Test Tier',
          description: 'Test tier description',
          level: 5,
          groups: ['premium-users'],
          limits: {
            tokensPerUnit: [{ count: 500, time: 5, unit: 'hour' }],
            requestsPerUnit: [{ count: 200, time: 3, unit: 'second' }],
          },
        }),
      ),
    });

    tiersPage.findTable().should('exist');
    tiersPage.findRows().should('have.length', 4);
    tiersPage.getRow('Test Tier').findName().should('contain.text', 'Test Tier');
  });

  it('should delete a tier', () => {
    cy.interceptOdh(
      'DELETE /maas/api/v1/tier/:name',
      { path: { name: 'free' } },
      { data: null },
    ).as('deleteTier');

    tiersPage.getRow('Free Tier').findDeleteButton().click();
    deleteTierModal.findInput().type('Free Tier');

    // Add this intercept before the next tiers call happens after deletion
    cy.interceptOdh('GET /maas/api/v1/tiers', {
      data: mockTiers().filter((tier) => tier.name !== 'free'),
    }).as('getTiers');

    deleteTierModal.findSubmitButton().click();

    cy.wait('@deleteTier').then(() => {
      cy.wait('@getTiers').then((interception) => {
        expect(interception.response?.body.data).to.deep.equal(
          mockTiers().filter((tier) => tier.name !== 'free'),
        );
      });
    });

    tiersPage.findTable().should('exist');
    tiersPage.findRows().should('have.length', 2);
    tiersPage.getRow('Premium Tier').findName().should('contain.text', 'Premium Tier');
    tiersPage.getRow('Enterprise Tier').findName().should('contain.text', 'Enterprise Tier');
    tiersPage.findTable().should('not.contain', 'Free Tier');
  });

  it('should display the tier details page', () => {
    tiersPage.findKebab('Free Tier').click();
    tiersPage.findViewDetailsButton().click();

    tiersPage.findTitle().should('contain.text', 'Free Tier');
    tierDetailsPage.findLevel().should('contain.text', '1');
    tierDetailsPage.findGroups().should('contain.text', 'all-users');
    tierDetailsPage.findLimits('10,000 tokens per 1 hour').should('exist');
    tierDetailsPage.findLimits('100 requests per 1 minute').should('exist');

    tierDetailsPage.findActionsButton().click();
  });
});
