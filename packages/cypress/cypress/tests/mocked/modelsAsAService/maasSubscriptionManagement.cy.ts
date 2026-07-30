import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { MODELS_AS_A_SERVICE_READY } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  subscriptionManagementPage,
  subscriptionsPage,
  authPoliciesPage,
} from '../../../pages/modelsAsAService';
import {
  mockSubscriptions,
  mockAuthPolicies,
  mockSubscriptionFormData,
  mockModelsOverview,
} from '../../../utils/maasUtils';

const setupCommonIntercepts = () => {
  asProductAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ modelAsService: true }));
  cy.interceptOdh('GET /maas/api/v1/user', {
    data: { userId: 'test-user', clusterAdmin: false },
  });
  cy.interceptOdh('GET /maas/api/v1/namespaces', { data: [] });
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
      },
      conditions: [{ type: MODELS_AS_A_SERVICE_READY, status: 'True', reason: 'Ready' }],
    }),
  );
  cy.interceptOdh('GET /maas/api/v1/subscription-policy-form-data', {
    data: mockSubscriptionFormData(),
  });
  cy.interceptOdh('GET /maas/api/v1/all-subscriptions', { data: mockSubscriptions() });
  cy.interceptOdh('GET /maas/api/v1/all-policies', { data: mockAuthPolicies() });
  cy.interceptOdh('GET /maas/api/v1/overview/models', { data: mockModelsOverview() });
  cy.interceptOdh('GET /maas/api/v1/subscription-policy-form-data', {
    data: mockSubscriptionFormData(),
  });
};

describe('Subscription Management Page / Overview Tab', () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });
  // it('should show the overview empty state when there are no subscriptions, policies, or model refs', () => {
  //   cy.interceptOdh('GET /maas/api/v1/subscription-policy-form-data', {
  //     data: mockSubscriptionFormData({
  //       groups: [],
  //       modelRefs: [],
  //       subscriptions: [],
  //       policies: [],
  //     }),
  //   });
  //   subscriptionManagementPage.visit();
  //   subscriptionManagementPage.findOverviewEmptyState().should('exist');
  //   subscriptionManagementPage.findSubscriptionsTab().should('not.exist');
  //   subscriptionManagementPage.findAuthPoliciesTab().should('not.exist');
  //   subscriptionManagementPage.findCreateSubscriptionButton().should('exist');
  //   subscriptionManagementPage.findCreateAuthPolicyButton().should('exist');
  // });

  // it('should show the overview empty state in the overview tab when there are no models', () => {
  //   cy.interceptOdh('GET /maas/api/v1/overview/models', { data: [] });
  //   subscriptionManagementPage.visit('overview');
  //   subscriptionManagementPage.findOverviewEmptyState().should('exist');
  //   subscriptionManagementPage.findSubscriptionsTab().should('be.visible');
  //   subscriptionManagementPage.findAuthPoliciesTab().should('be.visible');
  //   overviewTabPage.findTable().should('not.exist');
  // });

  // it('should show the filter empty state when overview filters match no models', () => {
  //   subscriptionManagementPage.visit('overview');
  //   overviewTabPage.findFilterInput('model').type('nonexistent-model-xyz');
  //   overviewTabPage.findEmptyTableState().should('exist');
  //   overviewTabPage.findClearFiltersButton().click();
  //   overviewTabPage.findModelRows().should('have.length', 4);
  // });

  it('should navigate between tabs and update the URL', () => {
    subscriptionManagementPage.visit();
    subscriptionManagementPage.findTitle().should('contain.text', 'MaaS governance');
    //subscriptionManagementPage.findOverviewTab().should('have.attr', 'aria-selected', 'true');

    subscriptionManagementPage.findSubscriptionsTab().click();
    cy.url().should('include', '/maas-governance/subscriptions');
    subscriptionsPage.findTable().should('exist');

    subscriptionManagementPage.findAuthPoliciesTab().click();
    cy.url().should('include', '/maas-governance/auth-policies');
    authPoliciesPage.findTable().should('exist');

    // subscriptionManagementPage.findOverviewTab().click();
    // cy.url().should('include', '/maas-governance/overview');
    // overviewTabPage.findTable().should('exist');
  });

  // it('should test sorting, expand/collapse, warning, and group chips in the overview tab', () => {
  //   subscriptionManagementPage.visit('overview');
  //   overviewTabPage.findTable().should('exist');

  //   // Sort by model name
  //   overviewTabPage.findColumnSortButton('Model name').click();
  //   overviewTabPage.findModelRows().eq(0).should('contain.text', 'Flan T5 Small');
  //   overviewTabPage.findModelRows().eq(3).should('contain.text', 'Llama 3 70B Instruct');

  //   // Sort by subscriptions
  //   overviewTabPage.findColumnSortButton('Subscriptions').click();
  //   overviewTabPage.findModelRows().eq(0).should('contain.text', 'Gemma 7B IT');

  //   // Sort by authorization policies
  //   overviewTabPage.findColumnSortButton('Authorization policies').click();
  //   overviewTabPage.findModelRows().eq(0).should('contain.text', 'Llama 3 70B Instruct');

  //   // Check warning icon for 0 policies
  //   overviewTabPage.findModelRows().eq(0).findByTestId('no-policies-warning').should('exist');
  //   overviewTabPage.findModelRows().eq(0).findByTestId('no-policies-warning').click();
  //   cy.contains('Configuration warning').should('be.visible');

  //   // Check warning icon for 0 subscriptions
  //   overviewTabPage.findModelRows().eq(1).findByTestId('no-subscriptions-warning').should('exist');
  //   overviewTabPage.findModelRows().eq(1).findByTestId('no-subscriptions-warning').click();
  //   cy.contains('Configuration warning').should('be.visible');

  //   // Expand the Llama row
  //   overviewTabPage.expandModelRow(0);
  //   overviewTabPage.findModelRows().eq(0).should('contain.text', 'No authorization policies');
  //   overviewTabPage.findModelRows().eq(0).should('contain.text', 'Enterprise Multi-Group Llama');

  //   // Expand the single subscription within Llama row (no "Expand all" since only 1)
  //   overviewTabPage
  //     .findModelRows()
  //     .eq(0)
  //     .contains('Enterprise Multi-Group Llama')
  //     .closest('tr')
  //     .find('button[aria-label="Details"]')
  //     .click();
  //   overviewTabPage.findModelRows().eq(0).should('contain.text', 'Token limits');
  //   overviewTabPage.findShowMoreGroupsInRow(0).should('contain.text', '4 more');
  //   overviewTabPage.findShowMoreGroupsInRow(0).click();
  //   overviewTabPage.findModelRows().eq(0).contains('interns').should('be.visible');
  //   overviewTabPage.findShowLessGroupsInRow(0).should('contain.text', 'Show less');
  //   overviewTabPage.findShowLessGroupsInRow(0).click();
  //   overviewTabPage.findShowMoreGroupsInRow(0).should('exist');

  //   // Expand Granite row
  //   overviewTabPage.expandModelRow(3);
  //   overviewTabPage.findExpandAllPoliciesInRow(3).should('contain.text', 'Expand all');
  //   overviewTabPage.findExpandAllPoliciesInRow(3).click();
  //   overviewTabPage.findExpandAllPoliciesInRow(3).should('contain.text', 'Collapse all');
  //   overviewTabPage.findExpandAllPoliciesInRow(3).click();
  //   overviewTabPage.findExpandAllPoliciesInRow(3).should('contain.text', 'Expand all');

  //   // Test kebab menu
  //   overviewTabPage.findKebabToggleInRow(0).click();
  //   overviewTabPage.findKebabAction('Create subscription').should('be.visible').click();
  //   cy.url().should('include', '/maas-governance/subscriptions/create');
  //   createSubscriptionPage.findModelsTable().should('contain.text', 'Llama 3 70B Instruct');
  //   createSubscriptionPage.findCancelButton().click();
  //   cy.url().should('include', '/maas-governance/overview');
  //   overviewTabPage.findKebabToggleInRow(0).click();
  //   overviewTabPage.findKebabAction('Create authorization policy').should('be.visible').click();
  //   cy.url().should('include', '/maas-governance/auth-policies/create');
  //   policyPage.findModelsTable().should('contain.text', 'Granite 3 8B Instruct');
  //   policyPage.findCancelButton().click();
  //   cy.url().should('include', '/maas-governance/overview');
  // });

  // it('should filter by model name, model ID, description, group name, subscription name, and authorization policy name', () => {
  //   subscriptionManagementPage.visit('overview');
  //   // Display name
  //   overviewTabPage.findFilterInput('model').type('Llama');
  //   overviewTabPage.findModelRows().should('have.length', 1);
  //   overviewTabPage.clearAllFilters();

  //   // Resource name
  //   overviewTabPage.findFilterInput('model').type('granite-3-8b-instruct');
  //   overviewTabPage.findModelRows().should('have.length', 1);
  //   overviewTabPage.clearAllFilters();

  //   // Description
  //   overviewTabPage.findFilterInput('model').type('instruction');
  //   overviewTabPage.findModelRows().should('have.length', 2);

  //   // Group name
  //   overviewTabPage.clearAllFilters();
  //   overviewTabPage.findFilterDropdownButton().click();
  //   overviewTabPage.findFilterDropdownItem('groupName').click();
  //   overviewTabPage.findFilterInput('group').type('interns');
  //   overviewTabPage.findModelRows().should('have.length', 2);
  //   overviewTabPage.clearAllFilters();
  //   overviewTabPage.findModelRows().should('have.length', 4);

  //   // Subscription name
  //   overviewTabPage.findFilterDropdownButton().click();
  //   overviewTabPage.findFilterDropdownItem('subscriptionName').click();
  //   overviewTabPage.findFilterInput('subscription').type('Team');
  //   overviewTabPage.findModelRows().should('have.length', 2);
  //   overviewTabPage.clearAllFilters();
  //   overviewTabPage.findModelRows().should('have.length', 4);

  //   // Authorization policy name
  //   overviewTabPage.findFilterDropdownButton().click();
  //   overviewTabPage.findFilterDropdownItem('authPolicyName').click();
  //   overviewTabPage.findFilterInput('policy').type('Team');
  //   overviewTabPage.findModelRows().should('have.length', 2);
  //   overviewTabPage.clearAllFilters();
  //   overviewTabPage.findModelRows().should('have.length', 4);
  // });

  // it('should navigate to the correct form when creating a subscription or authorization policy via the overview toolbar', () => {
  //   subscriptionManagementPage.visit('overview');
  //   overviewTabPage.findCreateSubscriptionButton().click();
  //   cy.url().should('include', '/maas-governance/subscriptions/create');
  //   createSubscriptionPage.findCancelButton().click();
  //   cy.url().should('include', '/maas-governance/overview');
  //   subscriptionManagementPage.findOverviewTab().click();
  //   overviewTabPage.findCreateAuthorizationPolicyButton().click();
  //   cy.url().should('include', '/maas-governance/auth-policies/create');
  //   policyPage.findCancelButton().click();
  //   cy.url().should('include', '/maas-governance/overview');
  // });
});
