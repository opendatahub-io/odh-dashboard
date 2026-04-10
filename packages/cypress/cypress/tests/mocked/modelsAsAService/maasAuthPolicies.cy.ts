import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { pageNotfound } from '../../../pages/pageNotFound';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  authPoliciesPage,
  deleteAuthPolicyModal,
  policyPage,
} from '../../../pages/modelsAsAService';
import {
  mockAuthPolicies,
  mockCreatePolicyResponse,
  mockPolicyInfo,
  mockSubscriptionFormData,
} from '../../../utils/maasUtils';

const setupAuthPoliciesCommon = () => {
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
};

const setupAuthPolicyEditorSharedIntercepts = () => {
  setupAuthPoliciesCommon();
  cy.interceptOdh('GET /maas/api/v1/subscription-policy-form-data', {
    data: mockSubscriptionFormData(),
  });
  cy.interceptOdh('GET /maas/api/v1/all-policies', { data: mockAuthPolicies() });
};

const setupAuthPolicyCreatePageIntercepts = () => {
  setupAuthPolicyEditorSharedIntercepts();
  cy.interceptOdh('POST /maas/api/v1/new-policy', {
    data: mockCreatePolicyResponse(),
  }).as('createPolicy');
};

const setupAuthPolicyEditPageIntercepts = (policyName: string) => {
  setupAuthPolicyEditorSharedIntercepts();
  cy.interceptOdh(
    'GET /maas/api/v1/view-policy/:name',
    { path: { name: policyName } },
    { data: mockPolicyInfo(policyName) },
  );
  cy.interceptOdh(
    'PUT /maas/api/v1/update-policy/:name',
    { path: { name: policyName } },
    { data: mockPolicyInfo(policyName).policy },
  ).as('updatePolicy');
};

describe('MaaS Auth Policies', () => {
  beforeEach(() => {
    setupAuthPoliciesCommon();
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

describe('Auth policy create and edit pages', () => {
  describe('create policy page', () => {
    beforeEach(() => {
      setupAuthPolicyCreatePageIntercepts();
    });

    it('should create a policy with groups and models', () => {
      policyPage.visit();
      policyPage.findTitle().should('contain.text', 'Create policy');
      policyPage.findSubmitButton().should('be.disabled');

      policyPage.findDisplayNameInput().type('New Test Policy');
      policyPage.selectGroup('premium-users');
      policyPage.findAddModelsButton().click();
      policyPage.findAddModelsModal().should('exist');
      policyPage.findToggleModelInModal('granite-3-8b-instruct').click();
      policyPage.findConfirmAddModelsButton().click();
      policyPage.findModelsTable().should('contain.text', 'Granite 3 8B Instruct');

      policyPage.findSubmitButton().should('not.be.disabled');
      policyPage.findSubmitButton().click();

      cy.wait('@createPolicy').then((interception) => {
        expect(interception.request.body).to.containSubset({
          data: {
            name: 'new-test-policy',
            displayName: 'New Test Policy',
            subjects: { groups: [{ name: 'premium-users' }] },
            modelRefs: [{ name: 'granite-3-8b-instruct', namespace: 'maas-models' }],
          },
        });
      });
      cy.url().should('match', /\/maas\/auth-policies$/);
    });
  });

  describe('edit policy page', () => {
    beforeEach(() => {
      setupAuthPolicyEditPageIntercepts('premium-team-policy');
    });

    it('should update a policy', () => {
      policyPage.visit('premium-team-policy');
      policyPage.findTitle().should('contain.text', 'Edit policy');

      // cancel without editing navigates back without calling the API
      policyPage.findCancelButton().click();
      cy.url().should('match', /\/maas\/auth-policies$/);

      // re-open and perform an actual update
      policyPage.visit('premium-team-policy');
      policyPage.findDescriptionInput().clear();
      policyPage.findDescriptionInput().type('Updated policy description');
      policyPage.findSubmitButton().click();

      cy.wait('@updatePolicy').then((interception) => {
        expect(interception.request.body).to.containSubset({
          data: { description: 'Updated policy description' },
        });
      });
      cy.url().should('match', /\/maas\/auth-policies$/);
    });
  });
});
