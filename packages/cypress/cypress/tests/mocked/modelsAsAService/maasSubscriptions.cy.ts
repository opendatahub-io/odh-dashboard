import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  createSubscriptionPage,
  addModelsToSubscriptionModal,
  deleteSubscriptionModal,
  editRateLimitsModal,
  editSubscriptionPage,
  subscriptionsPage,
  viewSubscriptionPage,
} from '../../../pages/modelsAsAService';
import {
  mockSubscriptions,
  mockSubscriptionInfo,
  mockSubscriptionInfoMissingModelSummaries,
  mockSubscriptionFormData,
  mockCreateSubscriptionResponse,
  mockUpdateSubscriptionResponse,
} from '../../../utils/maasUtils';

const setupCommonIntercepts = () => {
  asProductAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ modelAsService: true }));
  cy.interceptOdh('GET /maas/api/v1/user', { data: { userId: 'test-user', clusterAdmin: false } });
  cy.interceptOdh('GET /maas/api/v1/namespaces', { data: [] });
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
      },
      conditions: [{ type: 'ModelsAsServiceReady', status: 'True', reason: 'Ready' }],
    }),
  );
};

describe('Subscriptions Page', () => {
  beforeEach(() => {
    setupCommonIntercepts();
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', { data: mockSubscriptions() });
    subscriptionsPage.visit();
  });

  it('should show the empty state when there are no subscriptions', () => {
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', {
      data: [],
    });
    subscriptionsPage.visit();
    subscriptionsPage.findEmptyState().should('exist');
    subscriptionsPage.findCreateSubscriptionButton().should('exist');
  });

  it('should display the subscriptions table with correct page content', () => {
    subscriptionsPage.findTitle().should('contain.text', 'Subscriptions');
    subscriptionsPage
      .findDescription()
      .should(
        'contain.text',
        'Create subscriptions to manage group access to MaaS endpoints, and to set token limits for each model.',
      );

    subscriptionsPage.findTable().should('exist');
    subscriptionsPage.findRows().should('have.length', 6);
    subscriptionsPage.findCreateSubscriptionButton().should('exist');

    const premiumRow = subscriptionsPage.getRow('Premium Team Subscription');
    premiumRow.findPhase().should('contain.text', 'Active');
    premiumRow.findName().should('contain.text', 'Premium Team Subscription');
    premiumRow.findGroups().should('contain.text', '1 Group');
    premiumRow.findModels().should('contain.text', '2 Models');
    premiumRow.findPriority().should('contain.text', '10');

    const basicRow = subscriptionsPage.getRow('Basic Team Subscription');
    basicRow.findName().should('contain.text', 'Basic Team Subscription');
    basicRow.findPhase().should('contain.text', 'Active');
    basicRow.findGroups().should('contain.text', '1 Group');
    basicRow.findModels().should('contain.text', '1 Model');
    basicRow.findPriority().should('contain.text', '0');

    const negativePriorityRow = subscriptionsPage.getRow('negative-priority-sub');
    negativePriorityRow.findName().should('contain.text', 'negative-priority-sub');
    negativePriorityRow.findPhase().should('contain.text', 'Active');
    negativePriorityRow.findGroups().should('contain.text', '1 Group');
    negativePriorityRow.findModels().should('contain.text', '1 Model');
    negativePriorityRow.findPriority().should('contain.text', '-10000');

    const failedRow = subscriptionsPage.getRow('failed-sub');
    failedRow.findPhase().should('contain.text', 'Failed');
    failedRow.findPhaseLabel().click();
    failedRow.findPhasePopover().should('contain.text', 'Failed');

    const pendingRow = subscriptionsPage.getRow('pending-sub');
    pendingRow.findPhase().should('contain.text', 'Pending');

    subscriptionsPage.findFilterInput().should('exist').type('premium');
    subscriptionsPage.findRows().should('have.length', 1);
    subscriptionsPage.findFilterResetButton().should('exist').click();
    subscriptionsPage.findRows().should('have.length', 6);

    premiumRow.findKebabAction('View details').should('exist');
    premiumRow.findKebabAction('Edit').should('exist');
    premiumRow.findKebabAction('Delete').should('exist');
  });

  it('should filter subscriptions by display name and description', () => {
    subscriptionsPage.findFilterInput().type('Team Subscription');
    subscriptionsPage.findRows().should('have.length', 2);
    subscriptionsPage.findFilterResetButton().click();
    subscriptionsPage.findRows().should('have.length', 6);

    subscriptionsPage.findFilterInput().type('enterprise');
    subscriptionsPage.findRows().should('have.length', 1);
    subscriptionsPage.findFilterResetButton().click();
    subscriptionsPage.findRows().should('have.length', 6);

    subscriptionsPage.findFilterInput().type('general users');
    subscriptionsPage.findRows().should('have.length', 1);
    subscriptionsPage.findFilterResetButton().click();
    subscriptionsPage.findRows().should('have.length', 6);
  });

  it('should disable the action buttons for a deleting subscription in the table and view page', () => {
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', {
      data: mockSubscriptions(),
    });
    cy.interceptOdh(
      'GET /maas/api/v1/subscription-info/:name',
      { path: { name: 'deleting-sub' } },
      { data: mockSubscriptionInfo('deleting-sub') },
    );
    subscriptionsPage.visit();
    subscriptionsPage.getRow('deleting-sub').findActionsToggle().should('be.disabled');
    cy.visit(`/maas/subscriptions/view/deleting-sub`);
    viewSubscriptionPage.findActionsToggle().click();
    viewSubscriptionPage.findDeleteActionButton().should('be.disabled');
    viewSubscriptionPage.findEditActionButton().should('be.disabled');
  });

  it('should delete a subscription', () => {
    cy.interceptOdh(
      'DELETE /maas/api/v1/subscription/:name',
      { path: { name: 'premium-team-sub' } },
      { data: { message: "MaaSSubscription 'premium-team-sub' deleted successfully" } },
    ).as('deleteSubscription');

    subscriptionsPage.getRow('Premium Team Subscription').findKebabAction('Delete').click();
    deleteSubscriptionModal.findInput().type('premium-team-sub');

    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', {
      data: mockSubscriptions().filter((subscription) => subscription.name !== 'premium-team-sub'),
    }).as('getSubscriptions');

    deleteSubscriptionModal.findSubmitButton().click();
    cy.wait('@deleteSubscription').then((response) => {
      expect(response.response?.body).to.deep.equal({
        data: { message: "MaaSSubscription 'premium-team-sub' deleted successfully" },
      });
    });
    subscriptionsPage.findRows().should('have.length', 5);
    subscriptionsPage.findTable().should('not.contain', 'premium-team-sub');
  });
});

describe('View Subscription Page', () => {
  const subscriptionName = 'premium-team-sub';

  beforeEach(() => {
    setupCommonIntercepts();
    cy.interceptOdh(
      'GET /maas/api/v1/subscription-info/:name',
      { path: { name: subscriptionName } },
      { data: mockSubscriptionInfo(subscriptionName) },
    );
  });

  it('should display the page content with title, breadcrumb, details, groups, and models', () => {
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', { data: mockSubscriptions() });
    subscriptionsPage.visit();
    subscriptionsPage.getRow('Premium Team Subscription').findKebabAction('View details').click();
    cy.url().should('include', `/maas/subscriptions/view/${subscriptionName}`);

    viewSubscriptionPage.findTitle().should('contain.text', 'Premium Team Subscription');

    viewSubscriptionPage
      .findDetailsSection()
      .and('contain.text', 'Phase')
      .and('contain.text', 'Active')
      .should('contain.text', 'Premium Team Subscription')
      .and('contain.text', 'Name')
      .and('contain.text', 'Created');

    viewSubscriptionPage.findGroupsSection().should('exist');
    viewSubscriptionPage.findGroupsTable().should('contain.text', 'premium-users');

    viewSubscriptionPage.findModelsSection().should('exist');
    viewSubscriptionPage
      .findModelsTable()
      .should('contain.text', 'granite-3-8b-instruct Display')
      .and('contain.text', 'granite-3-8b-instruct')
      .and('contain.text', 'maas-models')
      .and('contain.text', '100,000');

    viewSubscriptionPage.findBreadcrumbSubscriptionsLink().click();
    cy.url().should('include', '/maas/subscriptions');
  });

  it("should list models from the subscription when model ref doesn't exist", () => {
    const orphanSubName = 'missing-model-summary-sub';
    cy.interceptOdh(
      'GET /maas/api/v1/subscription-info/:name',
      { path: { name: orphanSubName } },
      { data: mockSubscriptionInfoMissingModelSummaries() },
    );
    viewSubscriptionPage.visit(orphanSubName);
    viewSubscriptionPage.findModelsSection().should('exist');
    viewSubscriptionPage
      .findModelsTable()
      .should('contain.text', 'deleted-model-ref')
      .and('contain.text', 'maas-models')
      .and('contain.text', '50,000');
  });

  it('should show error state when the subscription-info API fails', () => {
    cy.interceptOdh(
      'GET /maas/api/v1/subscription-info/:name',
      { path: { name: subscriptionName } },
      { forceNetworkError: true } as never,
    );
    viewSubscriptionPage.visit(subscriptionName);
    viewSubscriptionPage.findPageError().should('exist');
  });
});

describe('Subscription Create Page', () => {
  beforeEach(() => {
    setupCommonIntercepts();
    cy.interceptOdh('GET /maas/api/v1/subscription-policy-form-data', {
      data: mockSubscriptionFormData(),
    });
    cy.interceptOdh('POST /maas/api/v1/new-subscription', {
      data: mockCreateSubscriptionResponse(),
    }).as('createSubscription');
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', {
      data: mockSubscriptions(),
    });
  });

  it('should create a subscription with all fields', () => {
    createSubscriptionPage.visit();
    createSubscriptionPage.findTitle().should('contain.text', 'Create subscription');

    // Submit button should be disabled initially
    createSubscriptionPage.findCreateButton().should('be.disabled');

    // Fill in display name and description
    createSubscriptionPage.findDisplayNameInput().type('Test Subscription');
    createSubscriptionPage.findDescriptionInput().type('A test subscription');

    // Verify the priority does not conflict with existing subscriptions.
    // The mock subscriptions have priorities 10 and 0, so default should be non-conflicting.
    createSubscriptionPage.findPriorityInput().clear();
    createSubscriptionPage.findPriorityInput().type('10');
    createSubscriptionPage
      .findPriorityValidationError()
      .should('contain.text', 'Priority 10 is already used by');

    // Testing out max and min priority values
    createSubscriptionPage.findPriorityInput().clear();
    createSubscriptionPage.findPriorityInput().type('-1000000');
    createSubscriptionPage.findPriorityMinusButton().should('be.disabled');

    createSubscriptionPage.findPriorityInput().clear();
    createSubscriptionPage.findPriorityInput().type('-99999999999'); // Out of range the input will snap to -1000000
    createSubscriptionPage.findPriorityInput().should('have.value', '-1000000');

    createSubscriptionPage.findPriorityInput().clear();
    createSubscriptionPage.findPriorityInput().type('1000000');
    createSubscriptionPage.findPriorityPlusButton().should('be.disabled');

    createSubscriptionPage.findPriorityInput().clear();
    createSubscriptionPage.findPriorityInput().type('99999999999'); // Out of range the input will snap to 1000000
    createSubscriptionPage.findPriorityInput().should('have.value', '1000000');

    // Set a non-conflicting priority
    createSubscriptionPage.findPriorityInput().clear();
    createSubscriptionPage.findPriorityInput().type('5');
    createSubscriptionPage
      .findPriorityValidationError()
      .should('not.contain.text', 'is already used by');

    // Select groups and add a custom one
    createSubscriptionPage.selectGroup('premium-users');
    createSubscriptionPage.typeCustomGroup('my-custom-group');

    // Add a model to the subscription
    createSubscriptionPage.findAddModelsButton().click();
    addModelsToSubscriptionModal.shouldBeOpen();
    addModelsToSubscriptionModal.findTable().should('exist');
    addModelsToSubscriptionModal.findToggleModelButton('granite-3-8b-instruct').click();
    addModelsToSubscriptionModal.findConfirmButton().click();

    // Verify the model appears in the subscription models table
    createSubscriptionPage.findModelsTable().should('exist');
    createSubscriptionPage.findModelsTable().should('contain.text', 'Granite 3 8B Instruct');

    // Edit token rate limits for the added model
    createSubscriptionPage.findModelsTable().findByTestId('add-token-limit-0').click();
    editRateLimitsModal.shouldBeOpen();
    editRateLimitsModal.findCountInput(0).clear();
    editRateLimitsModal.findCountInput(0).type('100000');
    editRateLimitsModal.findSaveButton().should('be.disabled');
    editRateLimitsModal
      .findHelperText(0)
      .should('contain.text', 'Token count exceeds maximum allowed value');
    editRateLimitsModal.findCountInput(0).clear();
    editRateLimitsModal.findCountInput(0).type('5000');
    editRateLimitsModal.findTimeInput(0).clear();
    editRateLimitsModal.findTimeInput(0).type('100000');
    editRateLimitsModal.findSaveButton().should('be.disabled');
    editRateLimitsModal
      .findHelperText(0)
      .should('contain.text', 'Time value exceeds maximum allowed value');
    editRateLimitsModal.findTimeInput(0).clear();
    editRateLimitsModal.findTimeInput(0).type('1');
    editRateLimitsModal.findSaveButton().click();

    // Verify the auth policy checkbox is checked by default
    createSubscriptionPage.findAuthPolicyCheckbox().should('be.checked');

    // Submit the form
    createSubscriptionPage.findCreateButton().should('be.enabled');
    createSubscriptionPage.findCreateButton().click();

    cy.wait('@createSubscription');
    cy.get('@createSubscription')
      .its('response.body.data')
      .should('containSubset', {
        subscription: {
          name: 'test-subscription',
          displayName: 'Test Subscription',
          description: 'A test subscription',
          priority: 5,
          owner: {
            groups: [{ name: 'premium-users' }, { name: 'my-custom-group' }],
          },
          modelRefs: [
            {
              name: 'granite-3-8b-instruct',
              namespace: 'maas-models',
              tokenRateLimits: [{ limit: 5000, window: '1h' }],
            },
          ],
        },
        authPolicy: {
          name: 'test-subscription-policy',
          modelRefs: [{ name: 'granite-3-8b-instruct', namespace: 'maas-models' }],
          subjects: { groups: [{ name: 'premium-users' }, { name: 'my-custom-group' }] },
        },
      });

    // Verify we navigate back to the subscriptions list
    cy.url().should('include', '/subscriptions');
  });
});

describe('Edit Subscription Page', () => {
  const subscriptionName = 'basic-team-sub';

  beforeEach(() => {
    setupCommonIntercepts();
    cy.interceptOdh('GET /maas/api/v1/subscription-policy-form-data', {
      data: mockSubscriptionFormData(),
    });
    cy.interceptOdh(
      'GET /maas/api/v1/subscription-info/:name',
      { path: { name: subscriptionName } },
      { data: mockSubscriptionInfo(subscriptionName) },
    );
  });

  it('should prefill the form with existing subscription data', () => {
    editSubscriptionPage.visit(subscriptionName);
    editSubscriptionPage.findTitle().should('contain.text', 'Edit subscription');

    editSubscriptionPage.findNameInput().should('have.value', 'Basic Team Subscription');
    editSubscriptionPage.findPriorityInput().should('have.value', '0');
    editSubscriptionPage.findGroupsSelect().should('contain.text', 'system:authenticated');
    editSubscriptionPage.findModelsTable().should('contain.text', 'flan-t5-small');
  });

  it('should save an updated subscription', () => {
    cy.interceptOdh(
      'PUT /maas/api/v1/update-subscription/:name',
      { path: { name: subscriptionName } },
      { data: mockUpdateSubscriptionResponse(subscriptionName) },
    ).as('updateSubscription');

    editSubscriptionPage.visit(subscriptionName);

    editSubscriptionPage.findNameInput().clear().type('Updated Subscription');
    editSubscriptionPage.findDescriptionInput().clear().type('Updated description');

    editSubscriptionPage.findSaveButton().click();

    cy.wait('@updateSubscription');
    cy.url().should('include', '/subscriptions');
  });

  it('should show policy warning when groups are changed', () => {
    editSubscriptionPage.visit(subscriptionName);

    editSubscriptionPage.findPolicyChangeWarning().should('not.exist');

    editSubscriptionPage.selectGroup('premium-users');

    editSubscriptionPage.findPolicyChangeWarning().should('exist');
    editSubscriptionPage
      .findPolicyChangeWarning()
      .should('contain.text', 'Authorization policies are not automatically updated');
  });

  it('should navigate to subscriptions list on cancel', () => {
    editSubscriptionPage.visit(subscriptionName);
    editSubscriptionPage.findCancelButton().click();
    cy.url().should('include', '/subscriptions');
  });
});
