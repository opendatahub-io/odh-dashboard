import {
  checkMaaSAuthPolicyState,
  checkMaaSSubscriptionState,
  cleanupAuthPolicy,
  cleanupSubscription,
  createLLMInferenceServiceWithMaaSEnabled,
  createMaaSModelRef,
  modelsAsAServiceNamespace,
} from '../../../utils/oc_commands/maas';
import {
  addUserToProject,
  deleteOpenShiftProject,
  verifyOpenShiftProjectExists,
} from '../../../utils/oc_commands/project';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  maasGovernancePage,
  overviewTabPage,
  phaseModal,
  createSubscriptionPage,
  policyPage,
  editRateLimitsModal,
  addModelsToSubscriptionModal,
  viewSubscriptionPage,
  viewAuthPolicyPage,
} from '../../../pages/modelsAsAService';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { ModelAsAServiceTestData, DataConnectionUriReplacements } from '../../../types';
import { PhaseStatus } from '../../../types';
import { loadMaaSFixture } from '../../../utils/dataLoader';
import { createDataConnectionUri } from '../../../utils/oc_commands/dataConnection';
import {
  checkLLMInferenceServiceState,
  cleanupLLMInferenceService,
} from '../../../utils/oc_commands/modelServing';

const uuid = generateTestUUID();

let testData: ModelAsAServiceTestData;
let projectName: string;
let modelName: string;
let subscriptionName: string;
let policyName: string;
let modelUri: string;
let connectionName: string;
let subscriptionGroups: string[];
let tokenRateLimit: string;
const rowIndex = 0;

describe('MaaS Governance Overview tab', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadMaaSFixture('e2e/maas/testOverviewTab.yaml')
      .then((fixtureData: ModelAsAServiceTestData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = `${testData.singleModelName}-${uuid}`;
        subscriptionName = `${testData.subscriptionName}-${uuid}`;
        policyName = `${subscriptionName}-policy`;
        modelUri = testData.modelLocationURI;
        connectionName = `${modelName}-connection`;
        subscriptionGroups = testData.subscriptionGroups;
        tokenRateLimit = `${testData.tokenRateLimit.limit} / ${testData.tokenRateLimit.window} ${testData.tokenRateLimit.unit}`;
      })
      .then(() => {
        ensureAdminOcSession();
        cleanupSubscription(subscriptionName, modelsAsAServiceNamespace);
        cleanupAuthPolicy(policyName, modelsAsAServiceNamespace);

        cy.log(`Loaded project name: ${projectName}`);
        createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Wait for ${projectName}, then grant ${LDAP_ADMIN_USER.USERNAME} namespace admin`);
        return verifyOpenShiftProjectExists(projectName).then((exists) => {
          if (!exists) {
            throw new Error(`Project ${projectName} not found via oc before RBAC; cannot add user`);
          }
          return addUserToProject(projectName, LDAP_ADMIN_USER.USERNAME, 'admin');
        });
      })
      .then(() => {
        ensureAdminOcSession();
        cy.log('Create LLMInferenceService + MaaSModelRef');
        const dataConnectionReplacements: DataConnectionUriReplacements = {
          NAMESPACE: projectName,
          MODEL_URI: Buffer.from(modelUri).toString('base64'),
          CONNECTION_NAME: connectionName,
        };

        createDataConnectionUri(dataConnectionReplacements);
        createLLMInferenceServiceWithMaaSEnabled(
          projectName,
          modelName,
          dataConnectionReplacements.CONNECTION_NAME,
          'resources/maas/llmInferenceserviceWithMaasEnabled.yaml',
        );
        checkLLMInferenceServiceState(modelName, projectName, { checkReady: true });
        createMaaSModelRef(projectName, modelName);
      });
  });

  after(() => {
    ensureAdminOcSession();
    cy.log(`Cleaning up subscription: ${subscriptionName}`);
    if (subscriptionName) {
      cleanupSubscription(subscriptionName, modelsAsAServiceNamespace);
    }
    cy.log(`Cleaning up auth policy: ${policyName}`);
    if (policyName) {
      cleanupAuthPolicy(policyName, modelsAsAServiceNamespace);
    }
    if (modelName && projectName) {
      cy.log(`Cleaning up LLMInferenceService: ${modelName} in ${projectName}`);
      cleanupLLMInferenceService(modelName, projectName);
    }
    if (projectName) {
      deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
    }
  });

  it(
    'should render the overview table and support group-chip highlighting within a model row',
    { tags: ['@Smoke', '@SmokeSet5', '@Dashboard', '@MaaS', '@NonConcurrent', '@MaaSCI'] },
    () => {
      cy.step('Log into the application as admin');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);

      cy.step('Navigate to MaaS governance Overview tab');
      maasGovernancePage.visit('overview');
      overviewTabPage.findTable().should('exist');

      cy.step('Filter to the test model and validate the overview row');
      overviewTabPage.findFilterDropdownButton().click();
      overviewTabPage.findFilterDropdownItem('modelName').click();
      overviewTabPage.findFilterInput('model').type(modelName);

      const overviewRow = overviewTabPage.getRow(modelName, projectName);
      overviewRow.findModelName().should('contain.text', modelName);
      overviewRow.findModelId().should('contain.text', modelName);
      overviewRow.findModelDescription().should('contain.text', testData.singleModelDescription);
      overviewRow.findModelProject().should('contain.text', projectName);
      overviewRow.findModelPhase().should('contain.text', PhaseStatus.PENDING);
      // Verify the phase modal is displayed
      overviewRow.findModelPhaseLabel().click();
      phaseModal.find().should('exist');
      phaseModal.findAlert().should('exist');
      phaseModal.findAlertBody().should('exist');
      phaseModal.findCloseButton().click();
      phaseModal.shouldBeOpen(false);
      // Verify the subscriptions and policies warning icons are displayed
      overviewRow.findModelSubscriptions().should('contain.text', '0');
      overviewRow.findModelSubscriptionsWarning().should('exist');
      overviewRow.findModelAuthorizationPolicies().should('contain.text', '0');
      overviewRow.findModelPoliciesWarning().should('exist');

      cy.step('Create a subscription from Overview Tab');
      overviewRow.findKebabToggle().click();
      overviewRow.findCreateSubscriptionKebabAction().click();
      createSubscriptionPage.findTitle().should('exist');
      // model should be selected in the subscription
      createSubscriptionPage.findModelsTable().should('contain.text', modelName);
      viewSubscriptionPage.findBreadcrumbSubscriptionsLink().click();
      overviewTabPage.findTable().should('exist');
      overviewTabPage.findCreateSubscriptionButton().click();
      createSubscriptionPage.findDisplayNameInput().type(subscriptionName);
      createSubscriptionPage.findDescriptionInput().type(testData.singleModelDescription);
      createSubscriptionPage.selectGroup(subscriptionGroups[0]);
      createSubscriptionPage.findAddModelsButton().click();
      addModelsToSubscriptionModal.shouldBeOpen();
      addModelsToSubscriptionModal.findTable().should('exist');
      addModelsToSubscriptionModal.findToggleModelButton(modelName, projectName).click();
      addModelsToSubscriptionModal.findConfirmButton().click();
      createSubscriptionPage.addTokenRateLimit(0);
      editRateLimitsModal.findSaveButton().click();
      // uncheck create auth policy checkbox
      createSubscriptionPage.findAuthPolicyCheckbox().click();
      createSubscriptionPage.findCreateButton().click();

      cy.step('Verify the subscription count is updated in the Overview Tab');
      overviewTabPage.findTable().should('exist');
      overviewRow.findModelSubscriptions().should('contain.text', '1');
      overviewRow.findModelSubscriptionsWarning().should('not.exist');

      cy.step('Create authorization policy from Overview Tab');
      overviewRow.findKebabToggle().click();
      overviewRow.findCreatePolicyKebabAction().click();
      policyPage.findTitle().should('exist');
      policyPage.findModelsTable().should('contain.text', modelName);
      viewAuthPolicyPage.findBreadcrumbPoliciesLink().click();
      overviewTabPage.findTable().should('exist');
      overviewTabPage.findCreateAuthorizationPolicyButton().click();
      policyPage.findDisplayNameInput().type(policyName);
      policyPage.findDescriptionInput().type(testData.singleModelDescription);
      policyPage.selectGroup(subscriptionGroups[0]);
      policyPage.findAddModelsButton().click();
      addModelsToSubscriptionModal.shouldBeOpen();
      addModelsToSubscriptionModal.findTable().should('exist');
      addModelsToSubscriptionModal.findToggleModelButton(modelName, projectName).click();
      addModelsToSubscriptionModal.findConfirmButton().click();
      policyPage.findModelsTable().should('contain.text', modelName);
      policyPage.findSubmitButton().click();

      cy.step('Verify the policy count is updated in the Overview Tab');
      overviewTabPage.findTable().should('exist');
      overviewRow.findModelAuthorizationPolicies().should('contain.text', '1');
      overviewRow.findModelPoliciesWarning().should('not.exist');

      cy.step('Wait for subscription and auth policy CRs to reach Active');
      ensureAdminOcSession();
      checkMaaSSubscriptionState(subscriptionName, modelsAsAServiceNamespace, {
        phase: PhaseStatus.ACTIVE,
      });
      checkMaaSAuthPolicyState(policyName, modelsAsAServiceNamespace, {
        phase: PhaseStatus.ACTIVE,
      });

      cy.step('Verify the Model is Ready Status after creating the subscription and policy');
      overviewRow.findModelPhase().should('contain.text', PhaseStatus.READY);

      cy.step('Expand the model row and verify the subscription details');
      overviewTabPage.expandModelRow(rowIndex);
      overviewTabPage.expandExpandableItemInRow(rowIndex, subscriptionName);
      overviewTabPage
        .findExpandableItemName(rowIndex, subscriptionName)
        .should('contain.text', subscriptionName);
      overviewTabPage
        .findExpandableItemPhase(rowIndex, subscriptionName)
        .should('contain.text', PhaseStatus.READY);
      overviewTabPage
        .findExpandableItemTokenLimits(rowIndex, subscriptionName)
        .should('contain.text', tokenRateLimit);
      overviewTabPage
        .findExpandableItemGroupChip(rowIndex, subscriptionName, subscriptionGroups[0])
        .should('contain.text', subscriptionGroups[0]);

      cy.step(
        'Verify highlight matching subscriptions and policies when a group chip is clicked and Items are expanded',
      );
      overviewTabPage.findGroupChip(subscriptionGroups[0], rowIndex).should('be.visible');
      overviewTabPage.findGroupChip(subscriptionGroups[0], rowIndex).click();
      [subscriptionName, policyName].forEach((name) => {
        overviewTabPage.shouldExpandableItemInRowBeExpanded(rowIndex, name, true);
      });
      overviewTabPage.shouldGroupChipsBeHighlighted(subscriptionGroups[0], rowIndex, true, 2);

      cy.step('Verify the authorization policy name, status, and groups');
      overviewTabPage.expandExpandableItemInRow(rowIndex, policyName);
      overviewTabPage
        .findExpandableItemName(rowIndex, policyName)
        .should('contain.text', policyName);
      overviewTabPage
        .findExpandableItemPhase(rowIndex, policyName)
        .should('contain.text', PhaseStatus.READY);
      overviewTabPage
        .findExpandableItemGroupChip(rowIndex, policyName, subscriptionGroups[0])
        .should('contain.text', subscriptionGroups[0]);

      cy.step('Deselect the group chip and verify highlight clears on subscriptions and policies');
      overviewTabPage.findGroupChip(subscriptionGroups[0], rowIndex).click();
      overviewTabPage.shouldGroupChipsBeHighlighted(subscriptionGroups[0], rowIndex, false);

      cy.step('Verify the link on subscription name navigates to the subscription details page');
      overviewTabPage.findExpandableItemName(rowIndex, subscriptionName).click();
      viewSubscriptionPage.findTitle().should('contain.text', `${subscriptionName}`);
      viewSubscriptionPage.findBreadcrumbSubscriptionsLink().click();
      overviewTabPage.findTable().should('exist');

      cy.step('Verify the filter dropdown is displayed');
      overviewTabPage.findFilterDropdownButton().click();
      overviewTabPage.findFilterDropdownItem('project').click();
      overviewTabPage.findFilterInput('project').type(projectName);
      overviewTabPage.findFilterDropdownButton().click();
      overviewTabPage.findFilterDropdownItem('groupName').click();
      overviewTabPage.findFilterInput('group').type(subscriptionGroups[0]);
      overviewTabPage.findFilterDropdownButton().click();
      overviewTabPage.findFilterDropdownItem('subscriptionName').click();
      overviewTabPage.findFilterInput('subscription').type(subscriptionName);
      overviewTabPage.findFilterDropdownButton().click();
      overviewTabPage.findFilterDropdownItem('authPolicyName').click();
      overviewTabPage.findFilterInput('policy').type(policyName);
      overviewTabPage.findModelRows().should('have.length', 1);

      cy.step('Verify the link on policy name navigates to the policy details page');
      overviewTabPage.expandModelRow(rowIndex);
      overviewTabPage.expandExpandableItemInRow(rowIndex, policyName);
      overviewTabPage.shouldExpandableItemInRowBeExpanded(rowIndex, subscriptionName, false);
      overviewTabPage.findExpandableItemName(rowIndex, policyName).click();
      viewAuthPolicyPage.findTitle().should('contain.text', policyName);
      viewAuthPolicyPage.findBreadcrumbPoliciesLink().click();
      overviewTabPage.findTable().should('exist');
    },
  );
});
