import {
  createExternalProviderSecret,
  checkSecretExists,
  checkExternalProviderExists,
  modelsAsAServiceNamespace,
  checkMaaSAuthPolicyState,
  createMaaSAuthPolicy,
  createMaaSSubscription,
  checkMaaSSubscriptionState,
  checkExternalModelExists,
  checkMaaSModelRefExists,
  cleanupSubscription,
  cleanupAuthPolicy,
  cleanupApiKeys,
  cleanupExternalModelResources,
  cleanupExternalProvider,
  cleanupExternalProviderSecret,
} from '../../../utils/oc_commands/maas';
import { getClipboardContent } from '../../../utils/clipboardUtils';
import {
  stubClipboard,
  verifyMaaSModelInferenceUsingCopiedApiKeyFromModal,
} from '../../../utils/maasApiKeyClipboardInference';
import type { ExternalModelTestData } from '../../../types';
import { APIFormat, Path, PhaseStatus } from '../../../types';
import { addUserToProject, deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';
import { createCleanProject } from '../../../utils/projectChecker';
import { loadExternalModelFixture } from '../../../utils/dataLoader';
import {
  addProviderReferenceWizard,
  apiKeysPage,
  createApiKeyModal,
  createExternalModelPage,
  createExternalProviderModal,
  editExternalModelPage,
  editExternalProviderModal,
  externalModelProviderUrlModal,
  externalModelsPage,
  externalProvidersPage,
  pathModal,
  copyApiKeyModal,
} from '../../../pages/modelsAsAService';
import { generateTestUUID } from '../../../utils/uuidGenerator';

const uuid = generateTestUUID();

let projectName: string;
let existingSecretName: string;
let externalProviderName: string;
let providerDescription: string;
let externalModelName: string;
let externalModelDescription: string;
let providerType: string;
let providerEndpoint: string;
let providerAuthType: string;
let providerConfigPair: {
  key: string;
  value: string;
};
let targetModel: string;
let weight: number;
let weightPercentage: number;
let providerRef: {
  displayName: string;
  providerType: string;
  endpoint: string;
  newSecret: {
    name: string;
    apiKey: string;
  };
};
let pathPlaceholderKey: string;
let subscriptionName: string;
let subscriptionDescription: string;
let policiesName: string;
let apiKeyName: string;
const CLIPBOARD_WRITE_TEXT_STUB_ALIAS = 'clipboardWriteText';
describe('An admin can create, edit and delete external models and providers and create Subscriptions and Policies and inference services for external models.', () => {
  retryableBefore(() => {
    cy.log('Loading external model test data');
    return loadExternalModelFixture('e2e/maas/testExternalModels.yaml')
      .then((fixtureData: ExternalModelTestData) => {
        projectName = `${fixtureData.projectResourceName}-${uuid}`;
        existingSecretName = `${fixtureData.existingSecretName}-${uuid}`;
        externalProviderName = `${fixtureData.externalProviderName}-${uuid}`;
        providerDescription = `${fixtureData.providerDescription}`;
        externalModelName = `${fixtureData.externalModelName}-${uuid}`;
        externalModelDescription = `${fixtureData.externalModelDescription}`;
        providerType = fixtureData.providerType;
        providerEndpoint = fixtureData.providerEndpoint;
        providerAuthType = fixtureData.providerAuthType;
        providerConfigPair = fixtureData.providerConfigPair;
        targetModel = fixtureData.targetModel;
        weight = fixtureData.weight;
        weightPercentage = fixtureData.weightPercentage;
        providerRef = {
          ...fixtureData.providerRef,
          displayName: `${fixtureData.providerRef.displayName}-${uuid}`,
          newSecret: {
            ...fixtureData.providerRef.newSecret,
            name: `${fixtureData.providerRef.newSecret.name}-${uuid}`,
          },
        };
        pathPlaceholderKey = fixtureData.pathPlaceholderKey;
        subscriptionName = `${fixtureData.externalModelName}-subscription-${uuid}`;
        subscriptionDescription = 'Create a subscription for the external model';
        policiesName = `${fixtureData.externalModelName}-policies-${uuid}`;
        apiKeyName = `${fixtureData.externalModelName}-api-key-${uuid}`;
        cy.log(`Loaded project name: ${projectName}`);
      })
      .then(() => {
        ensureAdminOcSession();
        cleanupApiKeys(apiKeyName);
        cleanupSubscription(subscriptionName, modelsAsAServiceNamespace);
        cleanupAuthPolicy(policiesName, modelsAsAServiceNamespace);
        cleanupExternalModelResources(externalModelName, projectName);
        cleanupExternalProvider(externalProviderName, projectName);
        cleanupExternalProviderSecret(existingSecretName, projectName);
        cleanupExternalProviderSecret(providerRef.newSecret.name, projectName);
        createCleanProject(projectName);
      })
      .then(() => {
        ensureAdminOcSession();
        cy.log(
          `Grant ${LDAP_ADMIN_USER.USERNAME} edit access to both projects for namespace selector`,
        );
        return addUserToProject(projectName, LDAP_ADMIN_USER.USERNAME, 'edit');
      })
      .then(() => {
        ensureAdminOcSession();
        cy.log(`Create a Secret for the External Provider`);
        createExternalProviderSecret(projectName, existingSecretName);
      });
  });

  after(() => {
    ensureAdminOcSession();
    cleanupApiKeys(apiKeyName);
    cleanupSubscription(subscriptionName, modelsAsAServiceNamespace);
    cleanupAuthPolicy(policiesName, modelsAsAServiceNamespace);
    cleanupExternalModelResources(externalModelName, projectName);
    cleanupExternalProvider(externalProviderName, projectName);
    cleanupExternalProviderSecret(existingSecretName, projectName);
    cleanupExternalProviderSecret(providerRef.newSecret.name, projectName);
    deleteOpenShiftProject(projectName, {
      wait: true,
      ignoreNotFound: true,
      timeout: 300000,
    });
  });

  it(
    'Create Secret, ExternalProvider, ExternalModel from Models Page and verify subscription and policy creation and inference endpoint',
    {
      tags: ['@Smoke', '@SmokeSet5', '@Dashboard', '@MaaS', '@MaaSCI'],
    },
    () => {
      cy.step('Log into Deployments > External models as a admin user with the flag disabled');
      cy.clearCookies();
      externalModelsPage.visitAsUser(LDAP_ADMIN_USER, {
        enableExternalModelsFlag: false,
        projectName,
      });

      cy.step(`Select project ${projectName}  and find empty state for External Models`);
      externalModelsPage.findExternalModelsTab().should('exist');
      externalModelsPage.findProjectSelector().should('contain.text', projectName);
      externalModelsPage.findEmptyState().should('exist');

      cy.step(`Navigate to External Providers Page and find empty state and create new provider`);
      externalModelsPage.findExternalProvidersButton().click();
      externalProvidersPage.findProjectSelector().should('contain.text', projectName);
      externalProvidersPage.findEmptyState().should('exist');
      externalProvidersPage.findCreateExternalProviderButton().click();
      createExternalProviderModal.findDisplayNameInput().type(externalProviderName);
      createExternalProviderModal.selectProviderType(providerType);
      createExternalProviderModal.findEndpointInput().type(providerEndpoint);

      cy.step(`Select Existing Secret`);
      createExternalProviderModal.selectExistingSecret(existingSecretName);
      createExternalProviderModal.selectAuthentication(providerAuthType);
      createExternalProviderModal.findSubmitButton().click();

      cy.step(`Verify secret and External Provider is created`);
      checkSecretExists(projectName, existingSecretName);
      checkExternalProviderExists(projectName, externalProviderName, { phase: PhaseStatus.READY });

      const externalProviderRow = externalProvidersPage.getRow(externalProviderName);
      externalProviderRow.findName().should('contain.text', externalProviderName);
      externalProviderRow.findEndpointUrlLink(externalProviderName).click();
      pathModal.findInputValue().should('have.value', providerEndpoint);
      pathModal.findCloseButton().click();
      externalProviderRow.findPhaseLabel().should('contain.text', PhaseStatus.READY);

      cy.step(`Edit External Provider fields description.`);
      externalProviderRow.findEditButton().click();
      editExternalProviderModal.findDescriptionInput().clear().type(providerDescription);
      editExternalProviderModal.findSubmitButton().click();
      externalProviderRow.findDescription().should('contain.text', providerDescription);
      externalProviderRow.findPhaseLabel().should('contain.text', PhaseStatus.READY);

      cy.step(
        `Navigate to External Models Page and find empty state and create new  externalmodel`,
      );
      externalProvidersPage.findBreadcrumbExternalModelsLink().click();
      externalProvidersPage.findProjectSelector().should('contain.text', projectName);
      externalModelsPage.findEmptyState().should('exist');
      externalModelsPage.findAddExternalModelButton().click();
      createExternalModelPage
        .findProjectInput()
        .should('have.value', projectName)
        .should('be.disabled');
      createExternalModelPage.findDisplayNameInput().clear().type(externalModelName);
      createExternalModelPage.findProviderRefsRequiredInfo().should('exist');
      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.selectProvider(externalProviderName);
      addProviderReferenceWizard.findNextButton().should('be.enabled').click();
      addProviderReferenceWizard
        .findApiFormatSelect()
        .should('contain.text', APIFormat.OPENAI_CHAT);
      addProviderReferenceWizard.findTargetModelInput().clear().type(targetModel);
      addProviderReferenceWizard.findPathInput().should('have.value', Path.OPENAI_CHAT);
      addProviderReferenceWizard.findAddButton().should('be.enabled').click();

      cy.step('Verify provider ref Table');
      createExternalModelPage.findProviderRefsRequiredInfo().should('not.exist');
      const providerRefRow1 = createExternalModelPage.findProviderRefRow(0);
      providerRefRow1.findName().should('contain.text', externalProviderName);
      providerRefRow1.findTargetModelId().should('contain.text', targetModel);
      providerRefRow1.findApiFormat().should('contain.text', APIFormat.OPENAI_CHAT);
      providerRefRow1.findWeightInput().should('have.value', weight);
      providerRefRow1.findWeightPercent().should('contain.text', weightPercentage);

      cy.step('Add new provider reference in Create External Model Page');
      createExternalModelPage.findAddProviderReferenceButton().click();
      addProviderReferenceWizard.fillNewProviderFields({
        displayName: providerRef.displayName,
        providerType: providerRef.providerType,
        endpoint: providerRef.endpoint,
        newSecret: { name: providerRef.newSecret.name, apiKey: providerRef.newSecret.apiKey },
      });
      addProviderReferenceWizard.addInheritedProviderConfigPair(
        0,
        providerConfigPair.key,
        providerConfigPair.value,
      );
      addProviderReferenceWizard.findNextButton().should('be.enabled').click();
      addProviderReferenceWizard.selectAnthropicFormat();
      addProviderReferenceWizard.findTargetModelInput().clear().type(targetModel);
      addProviderReferenceWizard.findPathInput().type(Path.MESSAGES);
      addProviderReferenceWizard.findResetPathButton().click();
      addProviderReferenceWizard.findPathInput().should('have.value', Path.MESSAGES);
      addProviderReferenceWizard
        .findPathInput()
        .type(`{pathPlaceholderKey}`, { parseSpecialCharSequences: false });
      addProviderReferenceWizard.findPathError().should('exist');

      addProviderReferenceWizard.expandAdvancedSettings();
      addProviderReferenceWizard.findInheritedProviderConfig();
      addProviderReferenceWizard
        .findInheritedConfigKey(providerConfigPair.key)
        .should('have.value', providerConfigPair.key);
      addProviderReferenceWizard
        .findInheritedConfigValue(providerConfigPair.key)
        .should('have.value', providerConfigPair.value);
      addProviderReferenceWizard.addModelConfigPair(0, pathPlaceholderKey, pathPlaceholderKey);
      addProviderReferenceWizard.findPathError().should('not.exist');
      addProviderReferenceWizard.findAddButton().should('be.enabled').click();

      checkExternalProviderExists(projectName, externalProviderName, { phase: PhaseStatus.READY });

      cy.step('Verify Distribute Equally button');
      const providerRefRow2 = createExternalModelPage.findProviderRefRow(1);
      providerRefRow2.findWeightMinusButton().click();
      createExternalModelPage.findDistributeEquallyButton().click();
      providerRefRow2.findWeightInput().should('have.value', weight);
      providerRefRow2.findWeightPercent().should('contain.text', weightPercentage / 2);
      createExternalModelPage.findCreateButton().click();

      cy.step(' verify external model and mass model ref is created');
      checkMaaSModelRefExists(projectName, externalModelName);
      checkExternalModelExists(projectName, externalModelName, { phase: PhaseStatus.READY });

      cy.step('Verify external model details');
      const row = externalModelsPage.getRow(externalModelName);
      row.findName().should('contain.text', externalModelName);
      row.findPhaseLabel().should('contain.text', PhaseStatus.READY);
      row.findExpandButton().click();
      row
        .findExpandedProviderRow(externalProviderName)
        .should('exist')
        .should('contain.text', externalProviderName);
      row.findExpandedViewUrlButton(externalProviderName).click();
      externalModelProviderUrlModal.findInputValue().should('have.value', providerEndpoint);
      externalModelProviderUrlModal.findCloseButton().click();
      row.findExpandedViewPathButton(providerRef.displayName).click();
      pathModal.findInputValue().should('have.value', `${Path.MESSAGES}{pathPlaceholderKey}`);
      pathModal.findCloseButton().click();
      row
        .findExpandedProviderStatus(externalProviderName)
        .should('contain.text', PhaseStatus.READY);

      cy.step('edit external model');
      row.findEditButton().click();
      createExternalModelPage.findDescriptionInput().clear().type(externalModelDescription);
      providerRefRow2.findRemoveButton().click();
      editExternalModelPage
        .findProviderReferencesTable()
        .should('not.contain.text', providerRef.displayName);
      editExternalModelPage.findUpdateButton().click();
      row.findDescription().should('contain.text', externalModelDescription);
      row.findExpandedProviderRow(providerRef.displayName).should('not.exist');

      cy.step(
        'Verify the pending governance warning next to status (subscription and policy needed)',
      );
      row.findGovernanceWarning().should('exist').click();
      row.findGovernanceWarningPopover().should('exist').and('be.visible');

      cy.step('Add Maas Governance Setup for the external model');
      createMaaSSubscription(
        subscriptionName,
        subscriptionDescription,
        projectName,
        externalModelName,
      );
      checkMaaSSubscriptionState(subscriptionName, modelsAsAServiceNamespace, {
        phase: PhaseStatus.ACTIVE,
      });
      createMaaSAuthPolicy(policiesName, projectName, externalModelName);
      checkMaaSAuthPolicyState(policiesName, modelsAsAServiceNamespace, {
        phase: PhaseStatus.ACTIVE,
      });

      cy.step('Verify the governance warning is removed');
      externalModelsPage.visitAsUser(LDAP_ADMIN_USER, {
        enableExternalModelsFlag: true,
        projectName,
      });
      row.findGovernanceWarning().should('not.exist');

      cy.step(' verify inference for the external model');
      apiKeysPage.visit();
      apiKeysPage.findCreateApiKeyButton().click();
      createApiKeyModal.shouldBeOpen();
      createApiKeyModal.findNameInput().type(apiKeyName);
      createApiKeyModal.findSubscriptionToggle().click().type(subscriptionName);
      createApiKeyModal.findSubscriptionOption(subscriptionName).click();
      createApiKeyModal.findSubmitButton().click();

      cy.step('Read the API key from the success dialog');
      copyApiKeyModal.shouldBeOpen();
      stubClipboard(CLIPBOARD_WRITE_TEXT_STUB_ALIAS);
      copyApiKeyModal.findApiKeyTokenCopyButton().click();
      getClipboardContent(CLIPBOARD_WRITE_TEXT_STUB_ALIAS).then((apiKeys: string[]) => {
        expect(apiKeys).to.have.length.at.least(1);
        copyApiKeyModal.findCloseButton().click();
        apiKeysPage.findRows().should('contain.text', apiKeyName);

        cy.step('Try and inference with the model using the copied API key');
        verifyMaaSModelInferenceUsingCopiedApiKeyFromModal(
          projectName,
          () => externalModelName,
          apiKeys[0],
        );
      });
    },
  );
});
