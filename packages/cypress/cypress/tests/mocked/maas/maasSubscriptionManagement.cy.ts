import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { MODELS_AS_A_SERVICE_READY } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  maasGovernancePage,
  subscriptionsPage,
  authPoliciesPage,
  overviewTabPage,
  createSubscriptionPage,
  policyPage,
  phaseModal,
} from '../../../pages/modelsAsAService';
import {
  mockSubscriptionFormData,
  interceptMaasGovernanceData,
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
  interceptMaasGovernanceData();
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

describe('MaaS Governance Page / Overview Tab', () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });
  it('should show the overview empty state when there are no subscriptions, policies, or model refs', () => {
    interceptMaasGovernanceData(
      mockSubscriptionFormData({
        groups: [],
        modelRefs: [],
        subscriptions: [],
        policies: [],
      }),
    );
    maasGovernancePage.visit();
    maasGovernancePage.findOverviewEmptyState().should('exist');
    maasGovernancePage.findSubscriptionsTab().should('not.exist');
    maasGovernancePage.findAuthPoliciesTab().should('not.exist');
    maasGovernancePage.findCreateSubscriptionButton().should('exist');
    maasGovernancePage.findCreateAuthPolicyButton().should('exist');
  });

  it('should show the overview empty state in the overview tab when there are no models', () => {
    interceptMaasGovernanceData(
      mockSubscriptionFormData({
        modelRefs: [],
      }),
    );
    maasGovernancePage.visit('overview');
    maasGovernancePage.findOverviewEmptyState().should('exist');
    maasGovernancePage.findSubscriptionsTab().should('be.visible');
    maasGovernancePage.findAuthPoliciesTab().should('be.visible');
    overviewTabPage.findTable().should('not.exist');
  });

  it('should show the filter empty state when overview filters match no models', () => {
    maasGovernancePage.visit('overview');
    overviewTabPage.findFilterInput('model').type('nonexistent-model-xyz');
    overviewTabPage.findEmptyTableState().should('exist');
    overviewTabPage.findClearFiltersButton().click();
    overviewTabPage.findModelRows().should('have.length', 6);
  });

  it('should display the overview table with correct page content', () => {
    maasGovernancePage.visit('overview');
    overviewTabPage.findTable().should('exist');
    const overviewRow = overviewTabPage.getRow('flan-t5-small', 'maas-models');
    overviewRow.findModelName().should('contain.text', 'Flan T5 Small');
    overviewRow.findModelId().should('contain.text', 'flan-t5-small');
    overviewRow.findModelDescription().should('contain.text', 'A compact text-to-text model');
    overviewRow.findModelProject().should('contain.text', 'maas-models');
    overviewRow.findModelSubscriptions().should('contain.text', '4');
    overviewRow.findModelPhase().should('contain.text', 'Ready');
    overviewRow.findModelAuthorizationPolicies().should('contain.text', '3');
  });

  it('should navigate between tabs and update the URL', () => {
    maasGovernancePage.visit();
    maasGovernancePage.findTitle().should('contain.text', 'MaaS governance');
    maasGovernancePage.findOverviewTab().should('have.attr', 'aria-selected', 'true');

    maasGovernancePage.findSubscriptionsTab().click();
    cy.url().should('include', '/maas-governance/subscriptions');
    subscriptionsPage.findTable().should('exist');

    maasGovernancePage.findAuthPoliciesTab().click();
    cy.url().should('include', '/maas-governance/auth-policies');
    authPoliciesPage.findTable().should('exist');

    maasGovernancePage.findOverviewTab().click();
    cy.url().should('include', '/maas-governance/overview');
    overviewTabPage.findTable().should('exist');
  });

  it('should test sorting, expand/collapse, warning, and group chips in the overview tab', () => {
    maasGovernancePage.visit('overview');
    overviewTabPage.findTable().should('exist');

    // Sort by model name
    overviewTabPage.findColumnSortButton('Model name').click();
    overviewTabPage.findModelRows().eq(1).should('contain.text', 'Flan T5 Small');
    overviewTabPage.findModelRows().eq(5).should('contain.text', 'Llama 3 70B Instruct');

    // Sort by project
    overviewTabPage.findColumnSortButton('Project').click();
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'maas-models');
    overviewTabPage.findModelRows().eq(5).should('contain.text', 'team-sandbox');

    // Sort by subscriptions
    overviewTabPage.findColumnSortButton('Subscriptions').click();
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'Gemma 7B IT');

    // Sort by phase
    overviewTabPage.findColumnSortButton('Status').click();
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'Failed');

    // Sort by authorization policies
    overviewTabPage.findColumnSortButton('Authorization policies').click();
    overviewTabPage.findModelRows().eq(0).should('contain.text', 'Llama 3 70B Instruct');

    const llamaRow = overviewTabPage.findModelRow('llama-3-70b-instruct', 'maas-models');
    const failedModelRow = overviewTabPage.findModelRow('failed-model', 'maas-models');

    // Check warning icon for 0 policies
    llamaRow.findModelPoliciesWarning().should('exist');
    llamaRow.findModelPoliciesWarning().click();
    cy.findByTestId('no-policies-warning-popover')
      .should('be.visible')
      .and('contain.text', 'No authorization policies');

    // Check warning icon for 0 subscriptions (failed-model also has 0 policies, so it
    // sorts next to Llama when sorted by authorization policy count)
    failedModelRow.findModelSubscriptionsWarning().should('exist');
    failedModelRow.findModelSubscriptionsWarning().click();
    cy.findByTestId('no-subscriptions-warning-popover')
      .should('be.visible')
      .and('contain.text', 'No subscriptions');

    // Check the phase modal contains the correct information
    overviewTabPage.findPhaseLabelInRow('failed-model', 'maas-models').click();
    phaseModal.find().should('exist');
    phaseModal.findAlert().should('exist');
    phaseModal.findAlertBody().should('exist');
    phaseModal.findApiDetailsButton().should('exist').click();
    phaseModal.findAlertDetailsCodeBlock().should('exist');
    phaseModal.findCloseButton().click();
    phaseModal.shouldBeOpen(false);

    // Expand the Llama row
    overviewTabPage.expandModelRow('llama-3-70b-instruct', 'maas-models');
    overviewTabPage
      .findModelRowRoot('llama-3-70b-instruct', 'maas-models')
      .should('contain.text', 'No authorization policies')
      .and('contain.text', 'Enterprise Multi-Group Llama');

    // Expand the single subscription within Llama row (no "Expand all" since only 1)
    overviewTabPage.expandExpandableItemInRow(
      'llama-3-70b-instruct',
      'maas-models',
      'Enterprise Multi-Group Llama Access',
    );
    overviewTabPage
      .findModelRowRoot('llama-3-70b-instruct', 'maas-models')
      .should('contain.text', 'Token limits');
    overviewTabPage
      .findShowMoreGroupsInRow('llama-3-70b-instruct', 'maas-models')
      .should('contain.text', '4 more');
    overviewTabPage.findShowMoreGroupsInRow('llama-3-70b-instruct', 'maas-models').click();
    overviewTabPage
      .findModelRowRoot('llama-3-70b-instruct', 'maas-models')
      .contains('interns')
      .should('be.visible');
    overviewTabPage
      .findShowLessGroupsInRow('llama-3-70b-instruct', 'maas-models')
      .should('contain.text', 'Show less');
    overviewTabPage.findShowLessGroupsInRow('llama-3-70b-instruct', 'maas-models').click();
    overviewTabPage.findShowMoreGroupsInRow('llama-3-70b-instruct', 'maas-models').should('exist');

    // Expand primary Granite row (maas-models) without expanding the sandbox duplicate
    overviewTabPage.expandModelRow('granite-3-8b-instruct', 'maas-models');
    overviewTabPage
      .findModelRow('granite-3-8b-instruct', 'maas-models')
      .findModelName()
      .should('contain.text', 'Granite 3 8B Instruct');
    overviewTabPage
      .findModelRowRoot('granite-3-8b-instruct', 'team-sandbox')
      .should('not.have.class', 'pf-m-expanded');
    overviewTabPage
      .findExpandAllPoliciesInRow('granite-3-8b-instruct', 'maas-models')
      .should('contain.text', 'Expand all');
    overviewTabPage.findExpandAllPoliciesInRow('granite-3-8b-instruct', 'maas-models').click();
    overviewTabPage
      .findExpandAllPoliciesInRow('granite-3-8b-instruct', 'maas-models')
      .should('contain.text', 'Collapse all');
    overviewTabPage.findExpandAllPoliciesInRow('granite-3-8b-instruct', 'maas-models').click();
    overviewTabPage
      .findExpandAllPoliciesInRow('granite-3-8b-instruct', 'maas-models')
      .should('contain.text', 'Expand all');

    // Same model ID in different namespaces expand independently
    overviewTabPage.expandModelRow('granite-3-8b-instruct', 'team-sandbox');
    overviewTabPage
      .findModelRowRoot('granite-3-8b-instruct', 'maas-models')
      .should('have.class', 'pf-m-expanded');
    overviewTabPage
      .findModelRowRoot('granite-3-8b-instruct', 'team-sandbox')
      .should('have.class', 'pf-m-expanded')
      .and('contain.text', 'Sandbox Granite Subscription');
    overviewTabPage.findFilterInput('model').type('Granite');
    overviewTabPage.findModelRows().should('have.length', 2);

    // The duplicate ID Granite model prefilled in the create subscription form
    overviewTabPage.findKebabToggleInRow('granite-3-8b-instruct', 'team-sandbox').click();
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
    overviewTabPage.findKebabToggleInRow('granite-3-8b-instruct', 'maas-models').click();
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
    maasGovernancePage.visit('overview');
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
    maasGovernancePage.visit('overview');
    overviewTabPage.findCreateSubscriptionButton().click();
    cy.url().should('include', '/maas-governance/subscriptions/create');
    createSubscriptionPage.findCancelButton().click();
    cy.url().should('include', '/maas-governance/overview');
    maasGovernancePage.findOverviewTab().click();
    overviewTabPage.findCreateAuthorizationPolicyButton().click();
    cy.url().should('include', '/maas-governance/auth-policies/create');
    policyPage.findCancelButton().click();
    cy.url().should('include', '/maas-governance/overview');
  });

  it('should highlight matching subscriptions and policies when a group chip is clicked', () => {
    maasGovernancePage.visit('overview');
    overviewTabPage.findFilterInput('model').type('Granite 3 8B Instruct');
    overviewTabPage.findModelRows().should('have.length', 2);

    const graniteModelId = 'granite-3-8b-instruct';
    const graniteNamespace = 'maas-models';
    overviewTabPage.expandModelRow(graniteModelId, graniteNamespace);
    overviewTabPage
      .findModelRowRoot(graniteModelId, graniteNamespace)
      .should('have.class', 'pf-m-expanded');

    // Manually expand one subscription so its group chips are visible
    overviewTabPage.expandExpandableItemInRow(
      graniteModelId,
      graniteNamespace,
      'Premium Team Subscription',
    );
    overviewTabPage
      .findGroupChip('premium-users', graniteModelId, graniteNamespace)
      .should('be.visible');

    // Select the group —> matching subs/policies expand and chips turn blue
    overviewTabPage.findGroupChip('premium-users', graniteModelId, graniteNamespace).click();
    overviewTabPage.shouldGroupChipsBeHighlighted(
      'premium-users',
      graniteModelId,
      graniteNamespace,
      true,
      5,
    );

    [
      'Premium Team Subscription',
      'deleting-sub',
      'test-subscription-policy',
      'Premium Team Policy',
      'deleting-policy',
    ].forEach((name) => {
      overviewTabPage
        .findExpandableItemInRow(graniteModelId, graniteNamespace, name)
        .should('have.class', 'pf-m-expanded');
    });

    // Items with non-matching groups stay collapsed
    ['failed-sub', 'failed-policy'].forEach((name) => {
      overviewTabPage
        .findExpandableItemInRow(graniteModelId, graniteNamespace, name)
        .should('not.have.class', 'pf-m-expanded');
    });

    // Unselect the group —> chips return to grey and the expanded items close
    overviewTabPage.findGroupChip('premium-users', graniteModelId, graniteNamespace).click();
    overviewTabPage.shouldGroupChipsBeHighlighted(
      'premium-users',
      graniteModelId,
      graniteNamespace,
      false,
      1,
    );

    ['deleting-sub', 'test-subscription-policy', 'Premium Team Policy', 'deleting-policy'].forEach(
      (name) => {
        overviewTabPage
          .findExpandableItemInRow(graniteModelId, graniteNamespace, name)
          .should('not.have.class', 'pf-m-expanded');
      },
    );

    // Manually expanded subscription and model row should have stayed open after we unselect the group
    overviewTabPage
      .findExpandableItemInRow(graniteModelId, graniteNamespace, 'Premium Team Subscription')
      .should('have.class', 'pf-m-expanded');
    overviewTabPage
      .findModelRowRoot(graniteModelId, graniteNamespace)
      .should('have.class', 'pf-m-expanded');
  });
});
