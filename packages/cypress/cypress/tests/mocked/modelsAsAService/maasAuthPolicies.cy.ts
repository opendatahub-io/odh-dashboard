import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { pageNotfound } from '../../../pages/pageNotFound';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { authPoliciesPage, deleteAuthPolicyModal } from '../../../pages/modelsAsAService';
import { mockAuthPolicies } from '../../../utils/maasUtils';

describe('MaaS Auth Policies', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ modelAsService: true, maasAuthPolicies: true }),
    );
    cy.interceptOdh('GET /maas/api/v1/user', {
      data: { userId: 'test-user', clusterAdmin: false },
    });
    cy.interceptOdh('GET /maas/api/v1/namespaces', { data: [] });
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
        },
      }),
    );
    cy.interceptOdh('GET /maas/api/v1/all-policies', { data: mockAuthPolicies() });
    authPoliciesPage.visit();
  });

  it('should not show the auth policies page when the feature flag is disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ modelAsService: true, maasAuthPolicies: false }),
    );
    cy.visitWithLogin('/maas/auth-policies');
    cy.findByTestId('app-page-title').should('not.exist');
    pageNotfound.findPage().should('exist');
  });

  it('should show the empty state when there are no auth policies', () => {
    cy.interceptOdh('GET /maas/api/v1/all-policies', { data: [] });
    authPoliciesPage.visit();
    authPoliciesPage.findEmptyState().should('exist');
    authPoliciesPage.findCreateAuthPolicyButton().should('exist');
  });

  it('should display the auth policies table with correct page content', () => {
    authPoliciesPage.findTitle().should('contain.text', 'Policies');
    authPoliciesPage.findTable().should('exist');
    authPoliciesPage.findRows().should('have.length', 3);
    const premiumRow = authPoliciesPage.getRow('premium-team-policy');
    premiumRow.findName().should('contain.text', 'premium-team-policy');
    premiumRow.findGroups().should('contain.text', '1 Group');
    premiumRow.findModels().should('contain.text', '2 Models');
    const basicRow = authPoliciesPage.getRow('basic-team-policy');
    basicRow.findName().should('contain.text', 'basic-team-policy');
    basicRow.findGroups().should('contain.text', '1 Group');
    basicRow.findModels().should('contain.text', '1 Model');
  });

  it('should delete an auth policy', () => {
    cy.interceptOdh(
      'DELETE /maas/api/v1/delete-policy/:name',
      { path: { name: 'premium-team-policy' } },
      { data: { message: "MaaSAuthPolicy 'premium-team-policy' deleted successfully" } },
    ).as('deleteAuthPolicy');
    authPoliciesPage.getRow('premium-team-policy').findKebabAction('Delete policy').click();
    deleteAuthPolicyModal.findInput().type('premium-team-policy');
    deleteAuthPolicyModal.findSubmitButton().click();
    cy.wait('@deleteAuthPolicy').then((response) => {
      expect(response.response?.body).to.deep.equal({
        data: { message: "MaaSAuthPolicy 'premium-team-policy' deleted successfully" },
      });
    });
  });
});
