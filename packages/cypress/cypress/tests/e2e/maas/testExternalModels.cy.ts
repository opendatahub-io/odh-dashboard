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
  deleteExternalModelModal,
  deleteExternalProviderModal,
} from '../../../pages/modelsAsAService';
import { generateTestUUID } from '../../../utils/uuidGenerator';

const uuid = generateTestUUID();

let projectName: string;
let existingSecretName: string;
let externalProviderName: string;
let providerDescription: string;
let kind: string;
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
let setupComplete = false;
const CLIPBOARD_WRITE_TEXT_STUB_ALIAS = 'clipboardWriteText';
const setupExternalModelProject = (scenario: string) => {
  setupComplete = false;
  cy.log('Loading external model test data');
  return loadExternalModelFixture('e2e/maas/testExternalModels.yaml')
    .then((fixtureData: ExternalModelTestData) => {
      projectName = `${fixtureData.projectResourceName}-${uuid}-${scenario}`;
      existingSecretName = `${fixtureData.existingSecretName}-${uuid}-${scenario}`;
      externalProviderName = `${fixtureData.externalProviderName}-${uuid}-${scenario}`;
      providerDescription = `${fixtureData.providerDescription}`;
      kind = fixtureData.kind;
      externalModelName = `${fixtureData.externalModelName}-${uuid}-${scenario}`;
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
        displayName: `${fixtureData.providerRef.displayName}-${uuid}-${scenario}`,
        newSecret: {
          ...fixtureData.providerRef.newSecret,
          name: `${fixtureData.providerRef.newSecret.name}-${uuid}-${scenario}`,
        },
      };
      pathPlaceholderKey = fixtureData.pathPlaceholderKey;
      subscriptionName = `${fixtureData.externalModelName}-subscription-${uuid}-${scenario}`;
      subscriptionDescription = 'Create a subscription for the external model';
      policiesName = `${fixtureData.externalModelName}-policies-${uuid}-${scenario}`;
      apiKeyName = `${fixtureData.externalModelName}-api-key-${uuid}-${scenario}`;
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
      cy.log(`Loaded project name: ${projectName}`);
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
      checkSecretExists(projectName, existingSecretName);
      setupComplete = true;
    });
};

const cleanupExternalModelProject = (): void => {
  if (!setupComplete) {
    return;
  }
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
};

const createExternalModelFromUI = (withSecondProvider: boolean): void => {
  cy.step('Log into Deployments > External models as a admin user with the flag disabled');
  externalModelsPage.visitAsUser(LDAP_ADMIN_USER, {
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

  cy.step(`Verify External Provider is created`);
  checkExternalProviderExists(projectName, externalProviderName, { phase: PhaseStatus.READY });
  const externalProviderRow = externalProvidersPage.getRow(externalProviderName);
  externalProviderRow.findName().should('contain.text', externalProviderName);
  externalProviderRow.findEndpointUrlLink(externalProviderName).click();
  pathModal.findInputValue().should('have.value', providerEndpoint);
  pathModal.findCloseButton().click();

  cy.step(`Edit External Provider fields description.`);
  externalProviderRow.findEditButton().click();
  editExternalProviderModal.findDescriptionInput().clear().type(providerDescription);
  editExternalProviderModal.findSubmitButton().click();
  externalProviderRow.findDescription().should('contain.text', providerDescription);
  externalProviderRow.findPhaseLabel().should('contain.text', PhaseStatus.READY);
  cy.step(`Navigate to External Models Page and find empty state and create new  externalmodel`);
  externalProvidersPage.findBreadcrumbExternalModelsLink().click();
  externalProvidersPage.findProjectSelector().should('contain.text', projectName);
  externalModelsPage.findEmptyState().should('exist');
  externalModelsPage.findAddExternalModelButton().click();
  createExternalModelPage
    .findProjectInput()
    .should('have.value', projectName)
    .should('be.disabled');
  createExternalModelPage.findDisplayNameInput().clear().type(externalModelName);
  createExternalModelPage.findAddProviderReferenceButton().click();
  addProviderReferenceWizard.findCancelButton().click();
  createExternalModelPage.findProviderRefsRequiredInfo().should('exist');
  createExternalModelPage.findAddProviderReferenceButton().click();
  addProviderReferenceWizard.selectProvider(externalProviderName);
  addProviderReferenceWizard.findNextButton().should('be.enabled').click();
  addProviderReferenceWizard.selectOpenAIFormat();
  addProviderReferenceWizard.findTargetModelInput().clear().type(targetModel);
  addProviderReferenceWizard.findPathInput().should('have.value', Path.OPENAI_CHAT);
  addProviderReferenceWizard.findAddButton().should('be.enabled').click();

  cy.step('Verify provider ref Table');
  const providerRefRow1 = createExternalModelPage.findProviderRefRow(0);
  providerRefRow1.findName().should('contain.text', externalProviderName);
  providerRefRow1.findTargetModelId().should('contain.text', targetModel);
  providerRefRow1.findApiFormat().should('contain.text', APIFormat.OPENAI_CHAT);
  providerRefRow1.findWeightInput().should('have.value', weight);
  providerRefRow1.findWeightPercent().should('contain.text', weightPercentage);
  if (withSecondProvider) {
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
    addProviderReferenceWizard.selectOpenAIFormat();
    addProviderReferenceWizard.findTargetModelInput().clear().type(targetModel);
    addProviderReferenceWizard.findPathInput().type(Path.OPENAI_CHAT);
    addProviderReferenceWizard.findResetPathButton().click();
    addProviderReferenceWizard.findPathInput().should('have.value', Path.OPENAI_CHAT);
    addProviderReferenceWizard
      .findPathInput()
      .type(`{${pathPlaceholderKey}}`, { parseSpecialCharSequences: false });
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

    checkExternalProviderExists(projectName, providerRef.displayName, {
      phase: PhaseStatus.READY,
    });

    cy.step('Verify Distribute Equally button');
    const providerRefRow2 = createExternalModelPage.findProviderRefRow(1);
    providerRefRow2.findWeightMinusButton().click();
    createExternalModelPage.findDistributeEquallyButton().click();
    providerRefRow2.findWeightInput().should('have.value', weight);
    providerRefRow2.findWeightPercent().should('contain.text', weightPercentage / 2);
  }

  createExternalModelPage.findCreateButton().click();

  cy.step('Verify external model and mass model ref is created');
  checkMaaSModelRefExists(projectName, externalModelName, {
    modelRef: { kind, name: externalModelName },
    displayName: externalModelName,
  });
  checkExternalModelExists(projectName, externalModelName, {
    phase: PhaseStatus.READY,
    modelName: externalModelName,
    externalProviderRefs: withSecondProvider
      ? [externalProviderName, providerRef.displayName]
      : [externalProviderName],
  });

  cy.step('Verify external model details');
  cy.reload();
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
  if (withSecondProvider) {
    row.findExpandedViewPathButton(providerRef.displayName).click();
    pathModal.findInputValue().should('have.value', `${Path.OPENAI_CHAT}{${pathPlaceholderKey}}`);
    pathModal.findCloseButton().click();
  }
  row.findExpandedProviderStatus(externalProviderName).should('contain.text', PhaseStatus.READY);
};

const configureGovernanceAndVerifyInference = (): void => {
  const row = externalModelsPage.getRow(externalModelName);
  cy.step('Verify the pending governance warning next to status (subscription and policy needed)');
  row.findGovernanceWarning().should('exist').click();
  row.findGovernanceWarningPopover().should('exist').and('be.visible');

  cy.step('Add Maas Governance Setup for the external model');
  createMaaSSubscription(subscriptionName, subscriptionDescription, projectName, externalModelName);
  checkMaaSSubscriptionState(subscriptionName, modelsAsAServiceNamespace, {
    phase: PhaseStatus.ACTIVE,
  });
  createMaaSAuthPolicy(policiesName, projectName, externalModelName);
  checkMaaSAuthPolicyState(policiesName, modelsAsAServiceNamespace, {
    phase: PhaseStatus.ACTIVE,
  });

  cy.step('Verify the governance warning is removed');
  externalModelsPage.visitAsUser(LDAP_ADMIN_USER, {
    projectName,
  });
  row.findGovernanceWarning().should('not.exist');

  cy.step(' Verify inference for the external model');
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
    copyApiKeyModal.acknowledgeKeyCopiedCheckbox();
    copyApiKeyModal.findCloseButton().click();
    apiKeysPage.findRows().should('contain.text', apiKeyName);

    cy.step('Try and inference with the model using the copied API key');
    verifyMaaSModelInferenceUsingCopiedApiKeyFromModal(
      projectName,
      () => externalModelName,
      apiKeys[0],
    );
  });
};

const editAndVerifyProviderWithdrawal = (): void => {
  const row = externalModelsPage.getRow(externalModelName);
  cy.step('Edit external model');
  row.findEditButton().click();
  createExternalModelPage.findDescriptionInput().clear().type(externalModelDescription);
  // remove the provider reference
  editExternalModelPage.findProviderRefRow(1).findRemoveButton().click();
  editExternalModelPage
    .findProviderReferencesTable()
    .should('not.contain.text', providerRef.displayName);
  editExternalModelPage.findUpdateButton().click();
  row.findDescription().should('contain.text', externalModelDescription);
  row.findExpandedProviderRow(providerRef.displayName).should('not.exist');
  checkMaaSModelRefExists(projectName, externalModelName, {
    displayName: externalModelName,
    description: externalModelDescription,
  });
  cy.step('Verify provider withdrawal starts with only the remaining reference');
  checkExternalModelExists(projectName, externalModelName, {
    phase: PhaseStatus.PENDING,
    externalProviderRefs: [externalProviderName],
    maxAttempts: 6, // 30 seconds at the default 5-second retry interval
  });
  checkExternalModelExists(projectName, externalModelName, {
    modelName: externalModelName,
    externalProviderRefs: [externalProviderName],
    // The reduced ExtProc revision must be serving before the fixed 310-second drain begins.
    maxAttempts: 84, // 7 minutes at the default 5-second retry interval
  });
};

const deleteExternalModelAndProvider = (): void => {
  cy.step('Delete the external model');
  externalModelsPage.visitAsUser(LDAP_ADMIN_USER, {
    projectName,
  });
  const deletedRow = externalModelsPage.getRow(externalModelName);
  deletedRow.findDeleteButton().click();
  deleteExternalModelModal.shouldBeOpen();
  deleteExternalModelModal.findInput().type(externalModelName);
  deleteExternalModelModal.findSubmitButton().click();

  cy.step('Verify the external model is deleted');
  checkExternalModelExists(projectName, externalModelName, { expectDeleted: true });
  checkMaaSModelRefExists(projectName, externalModelName, { expectDeleted: true });

  cy.step('Delete the external provider');
  externalProvidersPage.visitAsUser(LDAP_ADMIN_USER, {
    projectName,
  });
  const deletedProviderRow = externalProvidersPage.getRow(externalProviderName);
  deletedProviderRow.findDeleteButton().click();
  deleteExternalProviderModal.shouldBeOpen();
  deleteExternalProviderModal.findInput().type(externalProviderName);
  deleteExternalProviderModal.findSubmitButton().click();

  cy.step('Verify the external provider is deleted');
  checkExternalProviderExists(projectName, externalProviderName, { expectDeleted: true });
};

describe('External model lifecycle', () => {
  describe('Create an external model and verify inference', () => {
    retryableBefore(() => setupExternalModelProject('create'));
    after(cleanupExternalModelProject);

    it(
      'Creates and uses an external model with governance and an API key',
      { tags: ['@Smoke', '@SmokeSet5', '@Dashboard', '@MaaS', '@MaaSCI'] },
      () => {
        createExternalModelFromUI(false);
        configureGovernanceAndVerifyInference();
        deleteExternalModelAndProvider();
      },
    );
  });

  describe('Remove an external model provider reference', () => {
    retryableBefore(() => setupExternalModelProject('edit'));
    after(cleanupExternalModelProject);

    it(
      'Removes a provider reference and waits for the model to become Ready',
      { tags: ['@Smoke', '@SmokeSet5', '@Dashboard', '@MaaS', '@MaaSCI'] },
      () => {
        createExternalModelFromUI(true);
        editAndVerifyProviderWithdrawal();
      },
    );
  });
});
