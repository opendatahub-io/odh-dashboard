import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { MODELS_AS_A_SERVICE_READY } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '@odh-dashboard/internal/api/models/index';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  addProviderReferenceWizard,
  createExternalModelPage,
  deleteExternalModelModal,
  editProviderReferenceModal,
  externalModelProviderUrlModal,
  externalModelsPage,
  externalProvidersPage,
  pathModal,
  phaseModal,
} from '../../../pages/modelsAsAService';
import {
  mockExternalModel,
  mockExternalModels,
  mockExternalProvidersForCreateFlow,
  mockMaasNamespaces,
} from '../../../utils/maasUtils';

const TEST_PROJECT = 'test-project';

const setupCommonIntercepts = () => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({ modelAsService: true, externalModels: true }),
  );
  cy.interceptOdh('GET /maas/api/v1/user', {
    data: { userId: 'test-user', clusterAdmin: false },
  });
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: TEST_PROJECT })]),
  );
  cy.interceptOdh('GET /maas/api/v1/namespaces', { data: mockMaasNamespaces([TEST_PROJECT]) });
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
      conditions: [{ type: MODELS_AS_A_SERVICE_READY, status: 'True', reason: 'Ready' }],
    }),
  );
};

describe('External Models Page', () => {
  beforeEach(() => {
    setupCommonIntercepts();
  });

  it('should show the external models page', () => {
    cy.interceptOdh(
      'GET /maas/api/v1/externalmodel',
      { query: { namespace: TEST_PROJECT } },
      { data: [] },
    );
    externalModelsPage.visit();
    externalModelsPage.findExternalModelsTab().should('exist');
    externalModelsPage.findTabPageTitle().should('exist');
    externalModelsPage.findDescription().should('exist');
    externalModelsPage.findPage().should('exist');
    externalModelsPage.findProjectSelector().should('exist');
    externalModelsPage.findEmptyState().should('exist');
  });

  it('should not show the external models page when the feature flag is disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ modelAsService: true, externalModels: false }),
    );
    externalModelsPage.visit();
    externalModelsPage.findExternalModelsTab().should('not.exist');
    externalModelsPage.findPage().should('not.exist');
  });

  it('should not show the external models page when models as a service is disabled', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({ modelAsService: false, externalModels: true }),
    );
    externalModelsPage.visit();
    externalModelsPage.findExternalModelsTab().should('not.exist');
    externalModelsPage.findPage().should('not.exist');
  });

  it('should not show the external models tab when MaaS is not ready in the DSC', () => {
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
          [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        },
        conditions: [{ type: MODELS_AS_A_SERVICE_READY, status: 'False', reason: 'NotReady' }],
      }),
    );
    externalModelsPage.visit();
    externalModelsPage.findExternalModelsTab().should('not.exist');
    externalModelsPage.findPage().should('not.exist');
  });

  it('should link to the external providers page', () => {
    cy.interceptOdh(
      'GET /maas/api/v1/externalmodel',
      { query: { namespace: TEST_PROJECT } },
      { data: [] },
    );
    cy.interceptOdh(
      'GET /maas/api/v1/externalprovider',
      { query: { namespace: TEST_PROJECT } },
      { data: [] },
    );
    externalModelsPage.visit();
    externalModelsPage.findExternalProvidersButton().click();
    externalProvidersPage.findPageTitle().should('exist');
  });

  describe('with external models', () => {
    beforeEach(() => {
      cy.interceptOdh(
        'GET /maas/api/v1/externalmodel',
        { query: { namespace: TEST_PROJECT } },
        { data: mockExternalModels() },
      );
      externalModelsPage.visit();
      externalModelsPage.findTable().should('exist');
    });

    it('should display table content with status popover and expanded provider details', () => {
      externalModelsPage.findRows().should('have.length', 4);

      const gptRow = externalModelsPage.getRow('GPT-4o External');
      gptRow.findName().should('contain.text', 'GPT-4o External');
      gptRow
        .findDescription()
        .should('contain.text', 'External GPT-4o model routed through OpenAI provider.');
      gptRow.findProviderLabel('openai-prod').should('contain.text', 'OpenAI Production');
      gptRow.findPhaseLabel().should('contain.text', 'Ready');

      gptRow.findExpandButton().click();
      gptRow.findExpandedProviderName('openai-prod').should('contain.text', 'OpenAI Production');
      gptRow.findExpandedAuthMechanism('openai-prod').should('contain.text', 'API key');
      gptRow.findExpandedCredentialSecret('openai-prod').should('contain.text', 'openai-api-key');
      gptRow.findExpandedApiFormat('openai-prod').should('contain.text', 'openai-chat');
      gptRow.findExpandedTargetModel('openai-prod').should('contain.text', 'gpt-4o');
      gptRow.findExpandedWeight('openai-prod').should('contain.text', '100');

      gptRow.findExpandedViewUrlButton('openai-prod').click();
      externalModelProviderUrlModal.findInputValue().should('have.value', 'api.openai.com');
      externalModelProviderUrlModal.findProviderRef().should('contain.text', 'openai');
      externalModelProviderUrlModal.findTargetModelId().should('contain.text', 'gpt-4o');
      externalModelProviderUrlModal.findCloseButton().click();

      gptRow.findExpandedViewPathButton('openai-prod').click();
      pathModal.findInputValue().should('have.value', '/v1/chat/completions');
      pathModal.findSubContent().should('contain.text', 'openai');
      pathModal.findCloseButton().click();

      const splitRow = externalModelsPage.getRow('Claude A/B Split');
      splitRow.findExpandButton().click();
      splitRow
        .findExpandedProviderName('anthropic-dev')
        .should('contain.text', 'Anthropic Development');
      splitRow.findExpandedWeight('anthropic-dev').should('contain.text', '60');
      splitRow
        .findExpandedAuthMechanism('bedrock-us-east')
        .should('contain.text', 'Signature Version 4');
      splitRow
        .findExpandedCredentialSecret('bedrock-us-east')
        .should('contain.text', 'bedrock-credentials-us-east');
      splitRow.findExpandedWeight('bedrock-us-east').should('contain.text', '40');

      splitRow.findExpandedViewUrlButton('bedrock-us-east').click();
      externalModelProviderUrlModal
        .findInputValue()
        .should('have.value', 'bedrock.us-east-1.amazonaws.com');
      externalModelProviderUrlModal.findProviderRef().should('contain.text', 'aws-bedrock');
      externalModelProviderUrlModal
        .findTargetModelId()
        .should('contain.text', 'anthropic.claude-3-sonnet');
      externalModelProviderUrlModal.findCloseButton().click();

      splitRow.findExpandedViewPathButton('anthropic-dev').click();
      pathModal.findInputValue().should('have.value', '/v1/messages');
      pathModal.findSubContent().should('contain.text', 'anthropic');
      pathModal.findCloseButton().click();

      const awaitingRow = externalModelsPage.getRow('Awaiting Pairing Model');
      awaitingRow.findPhaseLabel().should('contain.text', 'Pending');
      awaitingRow.findPhaseLabel().click();
      phaseModal.find().should('exist');
      phaseModal.findAlert().should('exist');
      phaseModal.findAlertBody().should('exist');
      phaseModal.findApiDetailsButton().should('exist').click();
      phaseModal.findAlertDetailsCodeBlock().should('exist');
      phaseModal.findCloseButton().click();
      phaseModal.shouldBeOpen(false);

      awaitingRow.findGovernanceWarning().should('exist').click();
      awaitingRow
        .findGovernanceWarningPopover()
        .should('exist')
        .should('contain.text', 'Missing MaaS governance setup');

      const missingRefRow = externalModelsPage.getRow('Missing Ref Model');
      missingRefRow.findPhaseLabel().should('contain.text', 'Ready');
      missingRefRow.findMissingMaaSModelRefWarning().should('exist').click();
      missingRefRow
        .findMissingMaaSModelRefWarningPopover()
        .should('exist')
        .should('contain.text', 'Missing MaaS model setup');
    });

    it('should filter external models by keyword across name, display name, and description', () => {
      externalModelsPage.findRows().should('have.length', 4);

      externalModelsPage.findFilterInput().type('gpt-4o-external');
      externalModelsPage.findRows().should('have.length', 1);
      externalModelsPage.getRow('GPT-4o External').findName().should('exist');
      externalModelsPage.findFilterResetButton().click();
      externalModelsPage.findRows().should('have.length', 4);

      externalModelsPage.findFilterInput().type('Claude A/B');
      externalModelsPage.findRows().should('have.length', 1);
      externalModelsPage.getRow('Claude A/B Split').findName().should('exist');
      externalModelsPage.findFilterResetButton().click();
      externalModelsPage.findRows().should('have.length', 4);

      externalModelsPage.findFilterInput().type('subscription and auth pairing');
      externalModelsPage.findRows().should('have.length', 1);
      externalModelsPage.getRow('Awaiting Pairing Model').findName().should('exist');
      externalModelsPage.findFilterResetButton().click();
      externalModelsPage.findRows().should('have.length', 4);
    });

    it('should delete an external model', () => {
      cy.interceptOdh(
        'DELETE /maas/api/v1/externalmodel/:namespace/:name',
        { path: { namespace: TEST_PROJECT, name: 'gpt-4o-external' } },
        { data: null },
      ).as('deleteExternalModel');

      externalModelsPage.getRow('GPT-4o External').findKebabAction('Delete').click();
      deleteExternalModelModal.shouldShowResourceName('GPT-4o External');
      deleteExternalModelModal.findInput().type('GPT-4o External');
      deleteExternalModelModal.findSubmitButton().should('be.enabled');

      cy.interceptOdh(
        'GET /maas/api/v1/externalmodel',
        { query: { namespace: TEST_PROJECT } },
        {
          data: mockExternalModels().filter((model) => model.name !== 'gpt-4o-external'),
        },
      ).as('listExternalModels');

      deleteExternalModelModal.findSubmitButton().click();
      cy.wait('@deleteExternalModel');
      cy.wait('@listExternalModels');
      externalModelsPage.findRows().should('have.length', 3);
      externalModelsPage.findTable().should('not.contain', 'GPT-4o External');
    });
  });

  describe('create external models', () => {
    beforeEach(() => {
      cy.interceptOdh(
        'GET /maas/api/v1/externalmodel',
        { query: { namespace: TEST_PROJECT } },
        { data: [] },
      );
      cy.interceptOdh(
        'GET /maas/api/v1/externalprovider',
        { query: { namespace: TEST_PROJECT } },
        { data: mockExternalProvidersForCreateFlow() },
      );
    });

    it('should navigate to the create page from the external models list', () => {
      externalModelsPage.visit();
      externalModelsPage.findAddExternalModelButton().click();

      createExternalModelPage.findTitle().should('contain.text', 'Add external model');
      createExternalModelPage.findProjectInput().should('have.value', TEST_PROJECT);
      createExternalModelPage.findProviderRefsRequiredInfo().should('exist');
      createExternalModelPage.findCreateButton().should('be.disabled');
    });

    it('should add a provider reference through the wizard', () => {
      createExternalModelPage.visit();

      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.shouldBeOpen();
      addProviderReferenceWizard.findNextButton().should('be.disabled');

      addProviderReferenceWizard.selectProvider('Anthropic Provider');
      addProviderReferenceWizard.findNextButton().should('not.be.disabled').click();

      addProviderReferenceWizard.fillTargetModel('claude-sonnet-4-5-20241022');
      addProviderReferenceWizard.expandAdvancedSettings();
      addProviderReferenceWizard.findInheritedProviderConfig().should('exist');
      addProviderReferenceWizard.findInheritedConfigKey('project').should('have.value', 'project');
      addProviderReferenceWizard
        .findInheritedConfigValue('project')
        .should('have.value', 'my-project');

      addProviderReferenceWizard.findAddButton().click();
      addProviderReferenceWizard.shouldBeOpen(false);

      createExternalModelPage.findProviderReferencesTable().should('exist');
      createExternalModelPage.findProviderRefRow(0).should('contain.text', 'Anthropic Provider');
      createExternalModelPage
        .findProviderRefRow(0)
        .should('contain.text', 'claude-sonnet-4-5-20241022');
      createExternalModelPage.findProviderRefRow(0).should('contain.text', 'OpenAI Chat');
      cy.findByTestId('provider-ref-weight-percent-0').should('contain.text', '100%');
    });

    it('should show a field error for an invalid provider reference path', () => {
      createExternalModelPage.visit();

      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.shouldBeOpen();
      addProviderReferenceWizard.selectProvider('Anthropic Provider');
      addProviderReferenceWizard.findNextButton().click();

      addProviderReferenceWizard.fillTargetModel('claude-sonnet-4');
      addProviderReferenceWizard.fillPath('v1/chat/completions');

      addProviderReferenceWizard.findAddButton().should('not.be.disabled').click();
      addProviderReferenceWizard.shouldBeOpen();
      addProviderReferenceWizard.find().should('contain.text', 'Path must start with /');
      createExternalModelPage.findProviderReferencesTable().should('not.exist');
    });

    it('should show a field error for unresolved path placeholders and clear it after adding config', () => {
      const missingPlaceholderError =
        'Missing values for: {key}. Set them in Advanced settings under Model configuration, or on the provider.';

      createExternalModelPage.visit();

      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.shouldBeOpen();
      addProviderReferenceWizard.selectProvider('Anthropic Provider');
      addProviderReferenceWizard.findNextButton().click();

      addProviderReferenceWizard.fillTargetModel('claude-sonnet-4');
      addProviderReferenceWizard.fillPath('/{key}/v1/chat/completions');

      addProviderReferenceWizard.findAddButton().should('not.be.disabled').click();
      addProviderReferenceWizard.shouldBeOpen();
      addProviderReferenceWizard.find().should('contain.text', missingPlaceholderError);
      createExternalModelPage.findProviderReferencesTable().should('not.exist');

      addProviderReferenceWizard.expandAdvancedSettings();
      addProviderReferenceWizard.addModelConfigPair(0, 'key', 'my-key');
      addProviderReferenceWizard.find().should('not.contain.text', missingPlaceholderError);

      addProviderReferenceWizard.findAddButton().click();
      addProviderReferenceWizard.shouldBeOpen(false);

      createExternalModelPage.findProviderReferencesTable().should('exist');
      createExternalModelPage.findProviderRefRow(0).should('contain.text', '/{key}/v1/chat/completions');
    });

    it('should edit a provider reference', () => {
      createExternalModelPage.visit();

      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.addProviderReference('Anthropic Provider', 'claude-sonnet-4');

      createExternalModelPage.findProviderRefEditButton(0).click();
      editProviderReferenceModal.shouldBeOpen();
      editProviderReferenceModal.findInheritedConfigToggle().click();
      editProviderReferenceModal
        .findInheritedConfigValue('project')
        .should('have.value', 'my-project');

      editProviderReferenceModal.findTargetModelInput().clear();
      editProviderReferenceModal.findTargetModelInput().type('claude-opus-4-20250514');
      editProviderReferenceModal.findSaveButton().click();
      editProviderReferenceModal.shouldBeOpen(false);

      createExternalModelPage
        .findProviderRefRow(0)
        .should('contain.text', 'claude-opus-4-20250514');
      createExternalModelPage.findProviderRefRow(0).should('not.contain.text', 'claude-sonnet-4');
    });

    it('should show zero total weight warning when all weights are 0 but still allow submit', () => {
      const createdModel = mockExternalModel({
        name: 'disabled-provider-model',
        displayName: 'Disabled Provider Model',
        modelName: 'Disabled Provider Model',
        providerRefs: [
          {
            providerName: 'anthropic-dev',
            weight: 0,
            apiFormat: 'openai-chat',
            path: '/v1/chat/completions',
            targetModel: 'claude-sonnet-4',
          },
        ],
      });

      cy.interceptOdh('POST /maas/api/v1/externalmodel', { data: createdModel }).as(
        'createExternalModel',
      );

      createExternalModelPage.visit();
      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.addProviderReference('Anthropic Provider', 'claude-sonnet-4');

      createExternalModelPage.setProviderRefWeight(0, 0);
      createExternalModelPage
        .findProviderRefWeightPercent(0)
        .should('contain.text', 'Excluded from routing');
      createExternalModelPage
        .findZeroTotalWeightWarning()
        .should(
          'contain.text',
          'Total weight is 0. At least one provider reference must have a weight greater than 0.',
        );

      createExternalModelPage.findDisplayNameInput().type('Disabled Provider Model');
      createExternalModelPage.findCreateButton().should('not.be.disabled').click();

      cy.wait('@createExternalModel').then((interception) => {
        expect(interception.request.body.data.providerRefs[0].weight).to.equal(0);
      });
    });

    it('should show distribute equally only for multiple provider references', () => {
      createExternalModelPage.visit();

      createExternalModelPage.findDistributeEquallyButton().should('not.exist');

      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.addProviderReference('Anthropic Provider', 'claude-sonnet-4');
      createExternalModelPage.findDistributeEquallyButton().should('not.exist');

      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.addProviderReference('OpenAI Production', 'gpt-4o');
      createExternalModelPage.findDistributeEquallyButton().should('be.visible');
      createExternalModelPage.findDistributeEquallyHelp().should('exist');
    });

    it('should reset all provider reference weights to 1 when distribute equally is clicked', () => {
      createExternalModelPage.visit();

      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.addProviderReference('Anthropic Provider', 'claude-sonnet-4');
      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.addProviderReference('OpenAI Production', 'gpt-4o');

      createExternalModelPage.setProviderRefWeight(0, 2);
      createExternalModelPage.setProviderRefWeight(1, 4);
      createExternalModelPage.findProviderRefWeightPercent(0).should('contain.text', '33%');
      createExternalModelPage.findProviderRefWeightPercent(1).should('contain.text', '67%');

      createExternalModelPage.findDistributeEquallyButton().click();

      createExternalModelPage.findProviderRefWeightInput(0).should('have.value', '1');
      createExternalModelPage.findProviderRefWeightInput(1).should('have.value', '1');
      createExternalModelPage.findProviderRefWeightPercent(0).should('contain.text', '50%');
      createExternalModelPage.findProviderRefWeightPercent(1).should('contain.text', '50%');
      createExternalModelPage.findZeroTotalWeightWarning().should('not.exist');
    });

    it('should keep the provider refs required info visible when all refs are removed', () => {
      createExternalModelPage.visit();

      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.addProviderReference('Anthropic Provider', 'claude-sonnet-4');
      createExternalModelPage.findProviderRefsRequiredInfo().should('not.exist');

      createExternalModelPage.findProviderRefRemoveButton(0).click();
      createExternalModelPage.findProviderRefsRequiredInfo().should('exist');
      createExternalModelPage.findCreateButton().should('be.disabled');
    });

    it('should create an external model with a provider reference', () => {
      const createdModel = mockExternalModel({
        name: 'gpt-4-turbo',
        displayName: 'GPT-4 Turbo',
        modelName: 'GPT-4 Turbo',
        description: 'External GPT-4 Turbo model',
        providerRefs: [
          {
            providerName: 'anthropic-dev',
            weight: 1,
            apiFormat: 'openai-chat',
            path: '/v1/chat/completions',
            targetModel: 'claude-sonnet-4',
          },
        ],
      });

      cy.interceptOdh('POST /maas/api/v1/externalmodel', { data: createdModel }).as(
        'createExternalModel',
      );

      createExternalModelPage.visit();
      createExternalModelPage.findDisplayNameInput().type('GPT-4 Turbo');
      createExternalModelPage.findDescriptionInput().type('External GPT-4 Turbo model');

      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.addProviderReference('Anthropic Provider', 'claude-sonnet-4');

      createExternalModelPage.findCreateButton().should('not.be.disabled').click();

      cy.wait('@createExternalModel').then((interception) => {
        expect(interception.request.body.data).to.deep.include({
          name: 'gpt-4-turbo',
          namespace: TEST_PROJECT,
          displayName: 'GPT-4 Turbo',
          modelName: 'GPT-4 Turbo',
          description: 'External GPT-4 Turbo model',
        });
        expect(interception.request.body.data.providerRefs).to.have.length(1);
        expect(interception.request.body.data.providerRefs[0]).to.deep.include({
          providerName: 'anthropic-dev',
          targetModel: 'claude-sonnet-4',
          apiFormat: 'openai-chat',
          path: '/v1/chat/completions',
          weight: 1,
        });
      });

      cy.url().should('include', `/ai-hub/models/deployments/external/${TEST_PROJECT}`);
      cy.url().should('not.include', '/register');
    });
  });
});
