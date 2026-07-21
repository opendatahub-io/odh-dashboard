import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig.js';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus.js';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { ProjectModel } from '@odh-dashboard/internal/api/models/index';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  deleteExternalModelModal,
  externalModelPathModal,
  externalModelProviderUrlModal,
  externalModelsPage,
} from '../../../pages/modelsAsAService';
import { mockExternalModels, mockMaasNamespaces } from '../../../utils/maasUtils';

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
      conditions: [{ type: 'ModelsAsServiceReady', status: 'True', reason: 'Ready' }],
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
        conditions: [{ type: 'ModelsAsServiceReady', status: 'False', reason: 'NotReady' }],
      }),
    );
    externalModelsPage.visit();
    externalModelsPage.findExternalModelsTab().should('not.exist');
    externalModelsPage.findPage().should('not.exist');
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
      gptRow.findPhaseLabel().click();
      gptRow
        .findPhasePopover()
        .should('contain.text', 'Ready')
        .and('contain.text', 'GPT-4o External');

      gptRow.findExpandButton().click();
      gptRow.findExpandedProviderName('openai-prod').should('contain.text', 'OpenAI Production');
      gptRow.findExpandedAuthMechanism('openai-prod').should('contain.text', 'API key');
      gptRow.findExpandedCredentialSecret('openai-prod').should('contain.text', 'openai-api-key');
      gptRow.findExpandedApiFormat('openai-prod').should('contain.text', 'openai-chat');
      gptRow.findExpandedTargetModel('openai-prod').should('contain.text', 'gpt-4o');
      gptRow.findExpandedWeight('openai-prod').should('contain.text', '100');

      gptRow.findExpandedViewUrlButton('openai-prod').click();
      externalModelProviderUrlModal.findInputValue().should('have.value', 'api.openai.com');
      externalModelProviderUrlModal.findProviderRef().should('contain.text', 'OpenAI Production');
      externalModelProviderUrlModal.findTargetModelId().should('contain.text', 'gpt-4o');
      externalModelProviderUrlModal.findCloseButton().click();

      gptRow.findExpandedViewPathButton('openai-prod').click();
      externalModelPathModal.findInputValue().should('have.value', '/v1/chat/completions');
      externalModelPathModal.findProviderRef().should('contain.text', 'OpenAI Production');
      externalModelPathModal.findCloseButton().click();

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
      externalModelProviderUrlModal.findProviderRef().should('contain.text', 'AWS Bedrock US East');
      externalModelProviderUrlModal
        .findTargetModelId()
        .should('contain.text', 'anthropic.claude-3-sonnet');
      externalModelProviderUrlModal.findCloseButton().click();

      splitRow.findExpandedViewPathButton('anthropic-dev').click();
      externalModelPathModal.findInputValue().should('have.value', '/v1/messages');
      externalModelPathModal.findProviderRef().should('contain.text', 'Anthropic Development');
      externalModelPathModal.findCloseButton().click();

      const awaitingRow = externalModelsPage.getRow('Awaiting Pairing Model');
      awaitingRow.findPhaseLabel().should('contain.text', 'Pending');
      awaitingRow.findGovernanceWarning().should('exist').click();
      awaitingRow
        .findGovernanceWarningPopover()
        .should('exist')
        .should('contain.text', 'Pending MaaS governance');

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
});
