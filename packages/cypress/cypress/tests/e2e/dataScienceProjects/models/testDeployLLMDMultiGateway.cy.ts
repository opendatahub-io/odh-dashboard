import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import {
  ModelLocationSelectOption,
  ModelStateLabel,
  ModelTypeLabel,
} from '../../../../utils/modelServingConstants';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { createCleanProject } from '../../../../utils/projectChecker';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
  modelServingWizardEdit,
  deleteModelServingModal,
  inferenceServiceActions,
} from '../../../../pages/modelServing';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import type {
  DataScienceProjectData,
  MultiGatewayFixtureRef,
  MultiGatewayTestData,
} from '../../../../types';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import {
  createCleanHardwareProfile,
  cleanupHardwareProfiles,
} from '../../../../utils/oc_commands/hardwareProfiles';
import {
  checkLLMInferenceServiceState,
  cleanupLLMInferenceService,
  patchLLMInferenceServiceContainerImage,
  verifyLLMInferenceServiceGatewayRefs,
  type LLMInferenceServiceGatewayRef,
} from '../../../../utils/oc_commands/modelServing';

const GATEWAY_FEATURE_FLAGS = 'llmGatewayField=true';

/** MultiSelection option label format expected by the gateway page object. */
const gatewayOptionLabel = (ref: MultiGatewayFixtureRef): string =>
  `${ref.name} | ${ref.namespace}`;

let testData: MultiGatewayTestData;
let projectName: string;
let modelURI: string;
let deploymentMethod: MultiGatewayTestData['deploymentMethod'];
let servingRuntime: string;
let hardwareProfileResourceName: string;
let hardwareProfileYamlPath: string;
let cpuContainerImage: string;
let gatewayOptionA: string;
let gatewayOptionB: string;
let gatewayRefA: LLMInferenceServiceGatewayRef;
let gatewayRefB: LLMInferenceServiceGatewayRef;
/** Actual LLMInferenceService names captured during each scenario for after() cleanup. */
let multiGwResourceName = '';
let emptyGwResourceName = '';
let editGwResourceName = '';
let singleGwResourceName = '';
const uuid = generateTestUUID();

const loginAndOpenDeployWizard = (): void => {
  cy.step('Log into the application as admin');
  cy.visitWithLogin(`/?devFeatureFlags=${GATEWAY_FEATURE_FLAGS}`, HTPASSWD_CLUSTER_ADMIN_USER);

  cy.step(`Navigate to the Project list tab and search for ${projectName}`);
  projectListPage.navigate();
  projectListPage.filterProjectByName(projectName);
  projectListPage.findProjectLink(projectName).click();

  cy.step('Open deploy model wizard');
  projectDetails.findSectionTab('model-server').click();
  modelServingGlobal.selectSingleServingModelButtonIfExists();
  modelServingGlobal.findDeployModelButton().click();
};

/**
 * Completes model details + model deployment steps via the form only.
 * CPU image is patched with oc after submit — editing YAML before submit locks the
 * wizard to the editor snapshot and drops later form field applies (e.g. gateway).
 */
const completeDetailsAndDeploymentSteps = (
  modelName: string,
  onResourceName: (resourceName: string) => void,
): void => {
  cy.step('Select Model details');
  modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
  modelServingWizard.findUrilocationInput().clear().type(modelURI);
  modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
  modelServingWizard
    .findSaveConnectionInput()
    .clear()
    .type(`${modelName}${testData.connectionNameSuffix}`);
  modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
  modelServingWizard.findNextButton().should('be.enabled').click();

  cy.step('Select Model deployment');
  modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
  modelServingWizard.findResourceNameButton().click();
  modelServingWizard
    .findResourceNameInput()
    .should('be.visible')
    .invoke('val')
    .should('be.a', 'string')
    .and('not.be.empty')
    .then((val) => {
      onResourceName(val as string);
    });
  modelServingWizard.selectPotentiallyDisabledProfile(hardwareProfileResourceName);
  modelServingWizard.selectDeploymentMethodByKey(deploymentMethod);
  modelServingWizard.findNumReplicasInputField().should('exist').should('have.value', '1');
  modelServingWizard.findNextButton().should('be.enabled').click();
};

const verifyGatewaysThenPatchCpuAndWaitReady = (
  getResourceName: () => string,
  expectedRefs: LLMInferenceServiceGatewayRef[],
): void => {
  cy.step('Verify gateway refs on the LLMInferenceService');
  // Resolve resource name inside cy.then so the callback from findResourceNameInput has run
  cy.then(() => {
    const resourceName = getResourceName();
    expect(resourceName, 'LLMInferenceService resource name').to.have.length.above(0);
    return verifyLLMInferenceServiceGatewayRefs(projectName, resourceName, expectedRefs).then(
      () => {
        cy.step('Patch CPU container image (non-GPU cluster workaround)');
        return patchLLMInferenceServiceContainerImage(
          projectName,
          resourceName,
          cpuContainerImage,
        ).then(() =>
          checkLLMInferenceServiceState(resourceName, projectName, { checkReady: true }),
        );
      },
    );
  });
};

const verifyModelRowReady = (modelName: string): void => {
  cy.step('Verify the model Row');
  const llmdRow = modelServingGlobal.getDeploymentRow(modelName);
  llmdRow.findStatusLabel(ModelStateLabel.READY).should('exist');
  llmdRow.findServingRuntime().should('have.text', servingRuntime);
};

const deleteDeploymentFromUi = (modelName: string): void => {
  cy.step(`Delete deployment ${modelName}`);
  const row = modelServingGlobal.getDeploymentRow(modelName);
  row.findKebab().click();
  inferenceServiceActions.findDeleteInferenceServiceAction().click();
  deleteModelServingModal.findInput().clear().type(modelName);
  deleteModelServingModal.findSubmitButton().should('be.enabled').click();
};

describe('A user can deploy LLMD models with multi-gateway selection', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture('e2e/dataScienceProjects/testDeployLLMDMultiGateway.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData as MultiGatewayTestData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelURI = testData.modelLocationURI;
        deploymentMethod = testData.deploymentMethod;
        servingRuntime = testData.servingRuntime;
        hardwareProfileResourceName = `${testData.hardwareProfileName}`;
        hardwareProfileYamlPath = `resources/yaml/llmd-hardware-profile.yaml`;
        cpuContainerImage = testData.cpuContainerImage;
        gatewayRefA = testData.gatewayA;
        gatewayRefB = testData.gatewayB;
        gatewayOptionA = gatewayOptionLabel(gatewayRefA);
        gatewayOptionB = gatewayOptionLabel(gatewayRefB);

        cy.log(`Loaded project name: ${projectName}`);
        createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Load Hardware Profile Name: ${hardwareProfileResourceName}`);
        createCleanHardwareProfile(hardwareProfileYamlPath);
      });
  });

  after(() => {
    cy.log(`Cleaning up Hardware Profile: ${testData.hardwareProfileName}`);
    cleanupHardwareProfiles(hardwareProfileResourceName);
    // Best-effort LLIS cleanup using names captured during scenarios (avoids KServe finalizer hangs)
    [multiGwResourceName, emptyGwResourceName, editGwResourceName, singleGwResourceName]
      .filter(Boolean)
      .forEach((resourceName) => {
        cleanupLLMInferenceService(resourceName, projectName);
      });
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify User Can Deploy an LLMD Model with multiple gateways',
    {
      tags: [
        '@Featureflagged',
        '@Dashboard',
        '@ModelServing',
        '@NonConcurrent',
        '@LLMDServingCI',
        '@ModelServingCI',
      ],
    },
    () => {
      const modelName = `${testData.singleModelName}-multi`;

      loginAndOpenDeployWizard();
      completeDetailsAndDeploymentSteps(modelName, (name) => {
        multiGwResourceName = name;
      });

      cy.step('Select Advanced settings — choose multiple gateways');
      modelServingWizard.findGatewaySelect().should('exist');
      modelServingWizard.findGatewaySelectOption(gatewayOptionA).click();
      modelServingWizard.findGatewaySelectOption(gatewayOptionB).click();
      modelServingWizard.findGatewaySelect().closeSelectMenu();
      modelServingWizard.findGatewaySelectRemoveChip(gatewayOptionA).should('exist');
      modelServingWizard.findGatewaySelectRemoveChip(gatewayOptionB).should('exist');
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
      modelServingWizard.findNextButton().click();

      cy.step('Review and submit');
      modelServingWizard.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(modelName);

      verifyGatewaysThenPatchCpuAndWaitReady(() => multiGwResourceName, [gatewayRefA, gatewayRefB]);
      verifyModelRowReady(modelName);

      deleteDeploymentFromUi(modelName);
    },
  );

  it(
    'Verify User Can Deploy an LLMD Model with no gateway selection',
    {
      tags: [
        '@Featureflagged',
        '@Dashboard',
        '@ModelServing',
        '@NonConcurrent',
        '@LLMDServingCI',
        '@ModelServingCI',
      ],
    },
    () => {
      const modelName = `${testData.singleModelName}-empty`;

      loginAndOpenDeployWizard();
      completeDetailsAndDeploymentSteps(modelName, (name) => {
        emptyGwResourceName = name;
      });

      cy.step('Select Advanced settings — leave gateway empty');
      modelServingWizard.findGatewaySelect().should('exist');
      modelServingWizard.findGatewaySelectRemoveChip(gatewayOptionA).should('not.exist');
      modelServingWizard.findGatewaySelectRemoveChip(gatewayOptionB).should('not.exist');
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
      modelServingWizard.findNextButton().click();

      cy.step('Review and submit');
      modelServingWizard.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(modelName);

      verifyGatewaysThenPatchCpuAndWaitReady(() => emptyGwResourceName, []);
      verifyModelRowReady(modelName);

      deleteDeploymentFromUi(modelName);
    },
  );

  it(
    'Verify User Can Edit an LLMD Model and preserve multiple gateway refs',
    {
      tags: [
        '@Featureflagged',
        '@Dashboard',
        '@ModelServing',
        '@NonConcurrent',
        '@LLMDServingCI',
        '@ModelServingCI',
      ],
    },
    () => {
      const modelName = `${testData.singleModelName}-edit`;

      loginAndOpenDeployWizard();
      completeDetailsAndDeploymentSteps(modelName, (name) => {
        editGwResourceName = name;
      });

      cy.step('Select Advanced settings — choose multiple gateways');
      modelServingWizard.findGatewaySelectOption(gatewayOptionA).click();
      modelServingWizard.findGatewaySelectOption(gatewayOptionB).click();
      modelServingWizard.findGatewaySelect().closeSelectMenu();
      modelServingWizard.findGatewaySelectRemoveChip(gatewayOptionA).should('exist');
      modelServingWizard.findGatewaySelectRemoveChip(gatewayOptionB).should('exist');
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
      modelServingWizard.findNextButton().click();
      modelServingWizard.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(modelName);

      verifyGatewaysThenPatchCpuAndWaitReady(() => editGwResourceName, [gatewayRefA, gatewayRefB]);

      cy.step('Edit deployment and verify gateway selections are preserved');
      modelServingGlobal.getDeploymentRow(modelName).findKebab().click();
      inferenceServiceActions.findEditInferenceServiceAction().click();
      modelServingWizardEdit.findNextButton().click(); // Model details
      modelServingWizardEdit.findNextButton().click(); // Model deployment

      cy.step('Advanced settings — gateway chips still selected');
      modelServingWizardEdit.findGatewaySelectRemoveChip(gatewayOptionA).should('exist');
      modelServingWizardEdit.findGatewaySelectRemoveChip(gatewayOptionB).should('exist');
      modelServingWizardEdit.findNextButton().click();

      cy.step('Save without changing gateway selections');
      modelServingWizardEdit.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(modelName);

      // Re-patch CPU image in case edit submit restored a non-CPU image
      verifyGatewaysThenPatchCpuAndWaitReady(() => editGwResourceName, [gatewayRefA, gatewayRefB]);
      verifyModelRowReady(modelName);

      deleteDeploymentFromUi(modelName);
    },
  );

  it(
    'Verify User Can Deploy an LLMD Model with a single gateway (regression)',
    {
      tags: [
        '@Featureflagged',
        '@Dashboard',
        '@ModelServing',
        '@NonConcurrent',
        '@LLMDServingCI',
        '@ModelServingCI',
      ],
    },
    () => {
      const modelName = `${testData.singleModelName}-single`;

      loginAndOpenDeployWizard();
      completeDetailsAndDeploymentSteps(modelName, (name) => {
        singleGwResourceName = name;
      });

      cy.step('Select Advanced settings — choose a single gateway');
      modelServingWizard.findGatewaySelectOption(gatewayOptionA).click();
      modelServingWizard.findGatewaySelect().closeSelectMenu();
      modelServingWizard.findGatewaySelectRemoveChip(gatewayOptionA).should('exist');
      modelServingWizard.findGatewaySelectRemoveChip(gatewayOptionB).should('not.exist');
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
      modelServingWizard.findNextButton().click();

      cy.step('Review and submit');
      modelServingWizard.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(modelName);

      verifyGatewaysThenPatchCpuAndWaitReady(() => singleGwResourceName, [gatewayRefA]);
      verifyModelRowReady(modelName);

      deleteDeploymentFromUi(modelName);
    },
  );
});
