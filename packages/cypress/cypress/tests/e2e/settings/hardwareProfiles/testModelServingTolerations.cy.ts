import type { ModelTolerationsTestData } from '../../../../types';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../../utils/modelServingConstants';
import {
  addUserToProject,
  addClusterRoleToUser,
  removeClusterRoleFromUser,
  deleteOpenShiftProject,
} from '../../../../utils/oc_commands/project';
import {
  ensureAdminOcSession,
  patchOpenShiftResource,
} from '../../../../utils/oc_commands/baseCommands';
import { loadModelTolerationsFixture } from '../../../../utils/dataLoader';
import { LDAP_CONTRIBUTOR_USER } from '../../../../utils/e2eUsers';
import { projectListPage, projectDetails } from '../../../../pages/projects';
import {
  modelServingGlobal,
  inferenceServiceModal,
  modelServingSection,
  modelServingWizard,
} from '../../../../pages/modelServing';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
  validateInferenceServiceTolerations,
} from '../../../../utils/oc_commands/modelServing';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { verifyDeploymentStatusModal } from '../../../../utils/models';
import {
  cleanupHardwareProfiles,
  createCleanHardwareProfile,
} from '../../../../utils/oc_commands/hardwareProfiles';
import { cleanupTemplates } from '../../../../utils/oc_commands/templates';
import { createCustomResource } from '../../../../utils/oc_commands/customResources';
import { generateTestUUID } from '../../../../utils/uuidGenerator';

let testData: ModelTolerationsTestData;
let projectName: string;
let resourceName: string;
let contributor: string;
let modelName: string;
let modelFilePath: string;
let tolerationValue: string;
let modelFormat: string;
let servingRuntime: string;
let isS390x: boolean;
const awsBucket = 'BUCKET_3' as const;
const projectUuid = generateTestUUID();
const applicationNamespace: string = Cypress.env('APPLICATIONS_NAMESPACE');

describe('ModelServing - tolerations tests', () => {
  retryableBefore(() => {
    // Setup: Load test data and ensure clean state
    return loadModelTolerationsFixture(
      'e2e/hardwareProfiles/testModelServingTolerations.yaml',
    ).then((fixtureData: ModelTolerationsTestData) => {
      testData = fixtureData;
      projectName = `${testData.modelServingTolerationsTestNamespace}-${projectUuid}`;
      contributor = LDAP_CONTRIBUTOR_USER.USERNAME;
      modelName = testData.modelName;
      modelFilePath = testData.modelFilePath;
      tolerationValue = testData.tolerationValue;
      modelFormat = testData.modelFormat;
      servingRuntime = testData.servingRuntime;
      isS390x = !!testData.isS390x;

      if (!projectName) {
        throw new Error('Project name is undefined or empty in the loaded fixture');
      }
      cy.log(`Loaded project name: ${projectName}`);
      createCleanHardwareProfile(testData.resourceYamlPath);

      if (isS390x && testData.servingRuntimeName && testData.servingRuntimeYamlPath) {
        cy.log(`Creating ServingRuntime for s390x: ${testData.servingRuntimeName}`);
        // Clean up any existing Template/ServingRuntime then apply fresh via Template resource.
        cleanupTemplates(testData.servingRuntimeName).then(() => {
          createCustomResource(applicationNamespace, testData.servingRuntimeYamlPath).then(
            (result) => {
              if (result.exitCode !== 0) {
                throw new Error(`Failed to create ServingRuntime template: ${result.stderr}`);
              }
            },
          );
        });
      }

      // Provision project with data connection (also handles project create/clean)
      provisionProjectForModelServing(
        projectName,
        awsBucket,
        'resources/yaml/data_connection_model_serving.yaml',
      );
      addUserToProject(projectName, contributor, 'edit');
      if (testData.clusterRole) {
        addClusterRoleToUser(testData.clusterRole, contributor, projectName);
      }
    });
  });

  //Cleanup: Delete Hardware Profile and the associated Project
  after(() => {
    ensureAdminOcSession();
    // Use the actual hardware profile name from the YAML, not the variable with UUID
    cy.log(`Cleaning up Hardware Profile: ${testData.hardwareProfileName}`);
    cleanupHardwareProfiles(testData.hardwareProfileName).then(() => {
      if (testData.clusterRole) {
        removeClusterRoleFromUser(testData.clusterRole, contributor, projectName);
      }
      if (isS390x && testData.servingRuntimeName) {
        cy.log(`Cleaning up ServingRuntime: ${testData.servingRuntimeName}`);
        cleanupTemplates(testData.servingRuntimeName);
      }
      // Delete provisioned Project
      if (projectName) {
        cy.log(`Deleting Project ${projectName} after the test has finished.`);
        deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
      }
    });
  });

  it(
    'Verify Model Serving Creation using Hardware Profiles and applying Tolerations',
    {
      tags: [
        '@HardwareProfileModelServing',
        '@HardwareProfiles',
        '@Dashboard',
        '@Smoke',
        '@SmokeSet3',
        '@ModelServing',
        '@HardwareProfilesCI',
      ],
    },
    () => {
      cy.log('Model Name:', modelName);
      // Authentication and navigation
      cy.step('Log into the application as non-admin');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      // Project navigation, add user and provide contributor permissions
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      // Navigate to Model Serving tab and Deploy a Single Model
      cy.step('Navigate to Model Serving and click to Deploy a Single Model');
      projectDetails.findSectionTab('model-server').click();
      // If we have only one serving model platform, then it is selected by default.
      // So we don't need to click the button.
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      // Launch a Single Serving Model and select the required entries
      cy.step(
        'Launch a Single Serving Model using OpenVINO Model Server and by selecting the Hardware Profile',
      );
      cy.step('Step 1: Model details');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.EXISTING).click();
      modelServingWizard.findLocationPathInput().clear().type(modelFilePath);
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.PREDICTIVE).click();
      modelServingWizard.findLocationPathInput().should('have.value', modelFilePath);
      modelServingWizard.findNextButton().click();

      cy.step('Step 2: Model deployment');
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.findResourceNameButton().click();
      modelServingWizard
        .findResourceNameInput()
        .should('be.visible')
        .invoke('val')
        .then((val) => {
          resourceName = val as string;
        });
      inferenceServiceModal.selectPotentiallyDisabledProfile(
        testData.hardwareProfileDeploymentSize,
        testData.hardwareProfileName,
      );
      if (isS390x) {
        modelServingWizard.selectServingRuntimeOption(servingRuntime);
        modelServingWizard.findModelFormatSelectOption(modelFormat).click({ force: true });
      } else {
        modelServingWizard.findModelFormatSelectOption(modelFormat).click();
        modelServingWizard.selectServingRuntimeOption(servingRuntime);
      }
      modelServingWizard.findNextButton().click();

      cy.step('Step 3: Advanced settings');
      modelServingWizard.findNextButton().click();

      cy.step('Step 4: Review');
      modelServingWizard.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(modelName);

      if (isS390x && testData.inferenceServicePatch) {
        patchOpenShiftResource(
          'inferenceservice',
          modelName,
          testData.inferenceServicePatch,
          projectName,
        );
      }

      //Verify the model created
      cy.step('Verify that the Model is created Successfully on the backend and frontend');
      cy.then(() => {
        checkInferenceServiceState(resourceName, projectName, { checkReady: true });
      });
      // Note reload is required as status tooltip was not found due to a stale element
      cy.reload();
      modelServingSection.findModelMetricsLink(modelName);
      verifyDeploymentStatusModal();

      // Validate that the toleration applied earlier displays in the newly created pod
      cy.step('Validate the Tolerations for the pod include the newly added toleration');
      cy.then(() => {
        validateInferenceServiceTolerations(
          projectName,
          resourceName, // InferenceService name
          {
            key: 'test-taint',
            operator: 'Equal',
            effect: tolerationValue,
          },
        ).then(() => {
          cy.log(`✅ Toleration value "${tolerationValue}" displays in the pod as expected`);
        });
      });
    },
  );
});
