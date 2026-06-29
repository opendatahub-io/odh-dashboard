import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  subscriptionManagementPage,
  subscriptionsPage,
  authPoliciesPage,
  overviewTabPage,
  createSubscriptionPage,
  policyPage,
} from '../../../pages/modelsAsAService';
import {
  mockSubscriptions,
  mockAuthPolicies,
  mockSubscriptionFormData,
  mockModelsOverview,
} from '../../../utils/maasUtils';

const setupCommonIntercepts = () => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ modelAsService: true, maasSettingsIaRedesign: true }),
  );
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
      conditions: [{ type: 'ModelsAsServiceReady', status: 'True', reason: 'Ready' }],
    }),
  );
  cy.interceptOdh('GET /maas/api/v1/all-subscriptions', { data: mockSubscriptions() });
  cy.interceptOdh('GET /maas/api/v1/all-policies', { data: mockAuthPolicies() });
  cy.interceptOdh('GET /maas/api/v1/overview/models', { data: mockModelsOverview() });
  cy.interceptOdh('GET /maas/api/v1/subscription-policy-form-data', {
    data: mockSubscriptionFormData(),
  });
};

describe('Subscription Management Page', () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it('should navigate between tabs and update the URL', () => {
    subscriptionManagementPage.visit();
    subscriptionManagementPage.findTitle().should('contain.text', 'Subscription management');
    subscriptionManagementPage.findOverviewTab().should('have.attr', 'aria-selected', 'true');

    subscriptionManagementPage.findSubscriptionsTab().click();
    cy.url().should('include', '/subscription-management/subscriptions');
    subscriptionsPage.findTable().should('exist');

    subscriptionManagementPage.findAuthPoliciesTab().click();
    cy.url().should('include', '/subscription-management/auth-policies');
    authPoliciesPage.findTable().should('exist');

    subscriptionManagementPage.findOverviewTab().click();
    cy.url().should('include', '/subscription-management/overview');
    overviewTabPage.findTable().should('exist');
  });

  it('should display subscriptions content within the subscriptions tab', () => {
    subscriptionManagementPage.visit('subscriptions');
    subscriptionsPage.findTable().should('exist');
    subscriptionsPage.findRows().should('have.length', 7);
    subscriptionsPage.findCreateSubscriptionButton().should('exist');

    subscriptionsPage.findFilterInput().type('premium');
    subscriptionsPage.findRows().should('have.length', 1);
    subscriptionsPage.findFilterResetButton().click();
    subscriptionsPage.findRows().should('have.length', 7);
  });

  it('should display auth policies content within the auth policies tab', () => {
    subscriptionManagementPage.visit('auth-policies');
    authPoliciesPage.findTable().should('exist');
    authPoliciesPage.findRows().should('have.length', 7);
    authPoliciesPage.findCreateAuthPolicyButton().should('exist');

    authPoliciesPage.findKeywordFilterInput().type('premium');
    authPoliciesPage.findRows().should('have.length', 1);
    authPoliciesPage.clearAllFilters();
    authPoliciesPage.findRows().should('have.length', 7);
  });

  it('should test sorting, expand/collapse, warning, and group chips in the overview tab', () => {
    subscriptionManagementPage.visit('overview');
    overviewTabPage.findTable().should('exist');

    // Sort by model name
    overviewTabPage.findColumnSortButton('Model name').click();
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'Flan T5 Small');
    overviewTabPage.findModelRows().eq(3).should('contain.text', 'Llama 3 70B Instruct');

    // Sort by subscriptions
    overviewTabPage.findColumnSortButton('Subscriptions').click();
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'Gemma 7B IT');

    // Sort by authorization policies
    overviewTabPage.findColumnSortButton('Authorization policies').click();
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'Llama 3 70B Instruct');

    // Check warning icon for 0 policies
    overviewTabPage.findModelRows().eq(0).findByTestId('no-policies-warning').should('exist');
    overviewTabPage.findModelRows().eq(0).findByTestId('no-policies-warning').click();
    cy.contains('Configuration warning').should('be.visible');

    // Check warning icon for 0 subscriptions
    overviewTabPage.findModelRows().eq(1).findByTestId('no-subscriptions-warning').should('exist');
    overviewTabPage.findModelRows().eq(1).findByTestId('no-subscriptions-warning').click();
    cy.contains('Configuration warning').should('be.visible');

    // Expand the Llama row
    overviewTabPage.expandModelRow(0);
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'No authorization policies');
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'Enterprise Multi-Group Llama');

    // Expand the single subscription within Llama row (no "Expand all" since only 1)
    overviewTabPage
      .findModelRows()
      .eq(0)
      .contains('Enterprise Multi-Group Llama')
      .closest('tr')
      .find('button[aria-label="Details"]')
      .click();
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'Token limits');
    overviewTabPage.findShowMoreGroupsInRow(0).should('contain.text', '4 more');
    overviewTabPage.findShowMoreGroupsInRow(0).click();
    overviewTabPage.findModelRows().eq(0).contains('interns').should('be.visible');
    overviewTabPage.findShowLessGroupsInRow(0).should('contain.text', 'Show less');
    overviewTabPage.findShowLessGroupsInRow(0).click();
    overviewTabPage.findShowMoreGroupsInRow(0).should('exist');

    // Expand Granite row
    overviewTabPage.expandModelRow(3);
    overviewTabPage.findExpandAllPoliciesInRow(3).should('contain.text', 'Expand all');
    overviewTabPage.findExpandAllPoliciesInRow(3).click();
    overviewTabPage.findExpandAllPoliciesInRow(3).should('contain.text', 'Collapse all');
    overviewTabPage.findExpandAllPoliciesInRow(3).click();
    overviewTabPage.findExpandAllPoliciesInRow(3).should('contain.text', 'Expand all');

    // Test kebab menu
    overviewTabPage.findKebabToggleInRow(0).click();
    overviewTabPage.findKebabAction('Create subscription').should('be.visible').click();
    cy.url().should('include', '/subscription-management/subscriptions/create');
    createSubscriptionPage.findModelsTable().should('contain.text', 'Llama 3 70B Instruct');
    createSubscriptionPage.findCancelButton().click();
    cy.url().should('include', '/subscription-management/overview');
    overviewTabPage.findKebabToggleInRow(0).click();
    overviewTabPage.findKebabAction('Create authorization policy').should('be.visible').click();
    cy.url().should('include', '/subscription-management/auth-policies/create');
    policyPage.findModelsTable().should('contain.text', 'Granite 3 8B Instruct');
    policyPage.findCancelButton().click();
    cy.url().should('include', '/subscription-management/overview');
  });
});
