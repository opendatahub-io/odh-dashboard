import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { MODELS_AS_A_SERVICE_READY } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  subscriptionManagementPage,
  subscriptionsPage,
  authPoliciesPage,
  overviewTabPage,
  createSubscriptionPage,
  policyPage,
  phaseModal,
} from '../../../pages/modelsAsAService';
import {
  mockSubscriptions,
  mockAuthPolicies,
  mockSubscriptionFormData,
  mockModelsOverview,
  mockSubscriptionInfo,
  mockPolicyInfo,
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
  cy.interceptOdh(
    'GET /maas/api/v1/subscription-info/:name',
    { path: { name: 'premium-team-sub' } },
    { data: mockSubscriptionInfo('premium-team-sub') },
  );
  cy.interceptOdh(
    'GET /maas/api/v1/view-policy/:name',
    { path: { name: 'premium-team-policy' } },
    { data: mockPolicyInfo('premium-team-policy') },
  );
};

describe('Subscription Management Page / Overview Tab', () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });
  it('should show the overview empty state when there are no subscriptions, policies, or model refs', () => {
    cy.interceptOdh('GET /maas/api/v1/subscription-policy-form-data', {
      data: mockSubscriptionFormData({
        groups: [],
        modelRefs: [],
        subscriptions: [],
        policies: [],
      }),
    });
    subscriptionManagementPage.visit();
    subscriptionManagementPage.findOverviewEmptyState().should('exist');
    subscriptionManagementPage.findSubscriptionsTab().should('not.exist');
    subscriptionManagementPage.findAuthPoliciesTab().should('not.exist');
    subscriptionManagementPage.findCreateSubscriptionButton().should('exist');
    subscriptionManagementPage.findCreateAuthPolicyButton().should('exist');
  });

  it('should show the overview empty state in the overview tab when there are no models', () => {
    cy.interceptOdh('GET /maas/api/v1/overview/models', { data: [] });
    subscriptionManagementPage.visit('overview');
    subscriptionManagementPage.findOverviewEmptyState().should('exist');
    subscriptionManagementPage.findSubscriptionsTab().should('be.visible');
    subscriptionManagementPage.findAuthPoliciesTab().should('be.visible');
    overviewTabPage.findTable().should('not.exist');
  });

  it('should show the filter empty state when overview filters match no models', () => {
    subscriptionManagementPage.visit('overview');
    overviewTabPage.findFilterInput('model').type('nonexistent-model-xyz');
    overviewTabPage.findEmptyTableState().should('exist');
    overviewTabPage.findClearFiltersButton().click();
    overviewTabPage.findModelRows().should('have.length', 6);
  });

  it('should display the overview table with correct page content', () => {
    subscriptionManagementPage.visit('overview');
    overviewTabPage.findTable().should('exist');
    const overviewRow = overviewTabPage.getRow('flan-t5-small', 'maas-models');
    overviewRow.findModelName().should('contain.text', 'Flan T5 Small');
    overviewRow.findModelId().should('contain.text', 'flan-t5-small');
    overviewRow.findModelDescription().should('contain.text', 'A compact text-to-text model');
    overviewRow.findModelProject().should('contain.text', 'maas-models');
    overviewRow.findModelSubscriptions().should('contain.text', '4');
    overviewRow.findModelPhase().should('contain.text', 'Ready');
    overviewRow.findModelAuthorizationPolicies().should('contain.text', '2');
  });

  it('should navigate between tabs and update the URL', () => {
    subscriptionManagementPage.visit();
    subscriptionManagementPage.findTitle().should('contain.text', 'MaaS governance');
    subscriptionManagementPage.findOverviewTab().should('have.attr', 'aria-selected', 'true');

    subscriptionManagementPage.findSubscriptionsTab().click();
    cy.url().should('include', '/maas-governance/subscriptions');
    subscriptionsPage.findTable().should('exist');

    subscriptionManagementPage.findAuthPoliciesTab().click();
    cy.url().should('include', '/maas-governance/auth-policies');
    authPoliciesPage.findTable().should('exist');

    subscriptionManagementPage.findOverviewTab().click();
    cy.url().should('include', '/maas-governance/overview');
    overviewTabPage.findTable().should('exist');
  });

  it('should test sorting, expand/collapse, warning, and group chips in the overview tab', () => {
    subscriptionManagementPage.visit('overview');
    overviewTabPage.findTable().should('exist');

    // Sort by model name
    overviewTabPage.findColumnSortButton('Model name').click();
    overviewTabPage.findModelRows().eq(1).should('contain.text', 'Flan T5 Small');
    overviewTabPage.findModelRows().eq(5).should('contain.text', 'Llama 3 70B Instruct');

    // Sort by project
    overviewTabPage.findColumnSortButton('Project').click();
    overviewTabPage.getRowByIndex(0).findModelProject().should('have.text', 'maas-models');
    overviewTabPage.getRowByIndex(5).findModelProject().should('have.text', 'team-sandbox');

    // Sort by subscriptions
    overviewTabPage.findColumnSortButton('Subscriptions').click();
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'Gemma 7B IT');

    // Sort by phase
    overviewTabPage.findColumnSortButton('Status').click();
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'Failed');

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

    // Check the phase modal contains the correct information
    overviewTabPage.findPhaseLabelInRow(1).click();
    phaseModal.find().should('exist');
    phaseModal.findAlert().should('exist');
    phaseModal.findAlertBody().should('exist');
    phaseModal.findApiDetailsButton().should('exist').click();
    phaseModal.findAlertDetailsCodeBlock().should('exist');
    phaseModal.findCloseButton().click();
    phaseModal.shouldBeOpen(false);

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

    // Re-sort by model name
    overviewTabPage.findColumnSortButton('Model name').click();

    // Expand primary Granite row (maas-models) without expanding the sandbox duplicate
    overviewTabPage.expandModelRow(3);
    overviewTabPage.findModelRows().eq(3).should('contain.text', 'Granite 3 8B Instruct');
    overviewTabPage.findModelRows().eq(4).should('not.have.class', 'pf-m-expanded');
    overviewTabPage.findExpandAllPoliciesInRow(3).should('contain.text', 'Expand all');
    overviewTabPage.findExpandAllPoliciesInRow(3).click();
    overviewTabPage.findExpandAllPoliciesInRow(3).should('contain.text', 'Collapse all');
    overviewTabPage.findExpandAllPoliciesInRow(3).click();
    overviewTabPage.findExpandAllPoliciesInRow(3).should('contain.text', 'Expand all');

    // Same model ID in different namespaces expand independently
    overviewTabPage.expandModelRow(4);
    overviewTabPage.findModelRows().eq(3).should('have.class', 'pf-m-expanded');
    overviewTabPage.findModelRows().eq(4).should('have.class', 'pf-m-expanded');
    overviewTabPage.findModelRows().eq(4).should('contain.text', 'Sandbox Granite Subscription');
    overviewTabPage.findFilterInput('model').type('Granite');
    overviewTabPage.findModelRows().should('have.length', 2);

    // The duplicate ID Granite model prefilled in the create subscription form
    overviewTabPage.findKebabToggleInRow(1).click();
    overviewTabPage.findKebabAction('Create subscription').should('be.visible').click();
    cy.url().should('include', '/maas-governance/subscriptions/create');
    createSubscriptionPage.findModelsTable().should('contain.text', 'Granite 3 8B Instruct');
    createSubscriptionPage
      .findModelsTable()
      .should('contain.text', 'Same model ID in a different namespace');
    createSubscriptionPage.findModelsTable().should('contain.text', 'team-sandbox');
    createSubscriptionPage.findCancelButton().click();
    cy.url().should('include', '/maas-governance/overview');
    overviewTabPage.findFilterInput('model').type('Granite');

    // The original Granite model prefilled in the create authorization policy form
    overviewTabPage.findModelRows().should('have.length', 2);
    overviewTabPage.findKebabToggleInRow(0).click();
    overviewTabPage.findKebabAction('Create authorization policy').should('be.visible').click();
    cy.url().should('include', '/maas-governance/auth-policies/create');
    policyPage.findModelsTable().should('contain.text', 'Granite 3 8B Instruct');
    policyPage
      .findModelsTable()
      .should('contain.text', 'Granite 3 8B Instruct is a large language model');
    policyPage.findModelsTable().should('contain.text', 'maas-models');
    policyPage.findCancelButton().click();
    cy.url().should('include', '/maas-governance/overview');
  });

  it('should filter by model name, model ID, description, project, group name, subscription name, and authorization policy name', () => {
    subscriptionManagementPage.visit('overview');
    // Display name
    overviewTabPage.findFilterInput('model').type('Llama');
    overviewTabPage.findModelRows().should('have.length', 1);
    overviewTabPage.clearAllFilters();

    // Resource name — same ID can exist in multiple namespaces
    overviewTabPage.findFilterInput('model').type('granite-3-8b-instruct');
    overviewTabPage.findModelRows().should('have.length', 2);
    overviewTabPage.clearAllFilters();

    // Description
    overviewTabPage.findFilterInput('model').type('instruction');
    overviewTabPage.findModelRows().should('have.length', 2);
    overviewTabPage.clearAllFilters();

    // Filter by project
    overviewTabPage.findFilterDropdownButton().click();
    overviewTabPage.findFilterDropdownItem('project').click();
    overviewTabPage.findFilterInput('project').type('team-sandbox');
    overviewTabPage.findModelRows().should('have.length', 1);
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'Granite 3 8B Instruct (sandbox)');
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'team-sandbox');

    // Group name
    overviewTabPage.clearAllFilters();
    overviewTabPage.findFilterDropdownButton().click();
    overviewTabPage.findFilterDropdownItem('groupName').click();
    overviewTabPage.findFilterInput('group').type('interns');
    overviewTabPage.findModelRows().should('have.length', 2);
    overviewTabPage.clearAllFilters();
    overviewTabPage.findModelRows().should('have.length', 6);

    // Subscription name
    overviewTabPage.findFilterDropdownButton().click();
    overviewTabPage.findFilterDropdownItem('subscriptionName').click();
    overviewTabPage.findFilterInput('subscription').type('Team');
    overviewTabPage.findModelRows().should('have.length', 2);
    overviewTabPage.clearAllFilters();
    overviewTabPage.findModelRows().should('have.length', 6);

    // Authorization policy name
    overviewTabPage.findFilterDropdownButton().click();
    overviewTabPage.findFilterDropdownItem('authPolicyName').click();
    overviewTabPage.findFilterInput('policy').type('Team');
    overviewTabPage.findModelRows().should('have.length', 2);
    overviewTabPage.clearAllFilters();
    overviewTabPage.findModelRows().should('have.length', 6);
  });

  it('should navigate to the correct form when creating a subscription or authorization policy via the overview toolbar', () => {
    subscriptionManagementPage.visit('overview');
    overviewTabPage.findCreateSubscriptionButton().click();
    cy.url().should('include', '/maas-governance/subscriptions/create');
    createSubscriptionPage.findCancelButton().click();
    cy.url().should('include', '/maas-governance/overview');
    subscriptionManagementPage.findOverviewTab().click();
    overviewTabPage.findCreateAuthorizationPolicyButton().click();
    cy.url().should('include', '/maas-governance/auth-policies/create');
    policyPage.findCancelButton().click();
    cy.url().should('include', '/maas-governance/overview');
  });

  it('should highlight matching subscriptions and policies when a group chip is clicked', () => {
    subscriptionManagementPage.visit('overview');
    overviewTabPage.findFilterInput('model').type('Granite 3 8B Instruct');
    overviewTabPage.findModelRows().should('have.length', 2);

    const graniteRow = 0;
    overviewTabPage.expandModelRow(graniteRow);
    overviewTabPage.findModelRows().eq(graniteRow).should('have.class', 'pf-m-expanded');

    // Manually expand one subscription so its group chips are visible
    overviewTabPage.expandExpandableItemInRow(graniteRow, 'Premium Team Subscription');
    overviewTabPage.findGroupChip('premium-users', graniteRow).should('be.visible');

    // Select the group —> matching subs/policies expand and chips turn blue
    overviewTabPage.findGroupChip('premium-users', graniteRow).click();
    overviewTabPage
      .findGroupChips('premium-users', graniteRow)
      .should('have.length', 5)
      .each(($chip) => {
        cy.wrap($chip).should('have.class', 'pf-m-blue');
      });

    [
      'Premium Team Subscription',
      'deleting-sub',
      'test-subscription-policy',
      'Premium Team Policy',
      'deleting-policy',
    ].forEach((name) => {
      overviewTabPage
        .findExpandableItemInRow(graniteRow, name)
        .should('have.class', 'pf-m-expanded');
    });

    // Items with non-matching groups stay collapsed
    ['failed-sub', 'failed-policy'].forEach((name) => {
      overviewTabPage
        .findExpandableItemInRow(graniteRow, name)
        .should('not.have.class', 'pf-m-expanded');
    });

    // Unselect the group —> chips return to grey and the expanded items close
    overviewTabPage.findGroupChip('premium-users', graniteRow).click();
    overviewTabPage
      .findGroupChips('premium-users', graniteRow)
      .should('have.length', 1)
      .and('have.class', 'pf-m-clickable'); // clickable meaning it's grey and can be selected, there's no explicitly grey color on this element

    ['deleting-sub', 'test-subscription-policy', 'Premium Team Policy', 'deleting-policy'].forEach(
      (name) => {
        overviewTabPage
          .findExpandableItemInRow(graniteRow, name)
          .should('not.have.class', 'pf-m-expanded');
      },
    );

    // Manually expanded subscription and model row should have stayed open after we unselect the group
    overviewTabPage
      .findExpandableItemInRow(graniteRow, 'Premium Team Subscription')
      .should('have.class', 'pf-m-expanded');
    overviewTabPage.findModelRows().eq(graniteRow).should('have.class', 'pf-m-expanded');
  });
});
