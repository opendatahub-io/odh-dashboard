import type { ModelTolerationsTestData } from '~/__tests__/cypress/cypress/types';
import {
  addUserToProject,
  deleteOpenShiftProject,
} from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { loadModelTolerationsFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { LDAP_CONTRIBUTOR_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import {
  modelServingGlobal,
  inferenceServiceModal,
  modelServingSection,
} from '~/__tests__/cypress/cypress/pages/modelServing';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
  validateInferenceServiceTolerations,
} from '~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { retryableBefore } from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { attemptToClickTooltip } from '~/__tests__/cypress/cypress/utils/models';
import {
  cleanupHardwareProfiles,
  createCleanHardwareProfile,
} from '~/__tests__/cypress/cypress/utils/oc_commands/hardwareProfiles';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { generateTestUUID } from '~/__tests__/cypress/cypress/utils/uuidGenerator';

let testData: ModelTolerationsTestData;
let projectName: string;
let contributor: string;
let modelName: string;
let modelFilePath: string;
let hardwareProfileResourceName: string;
let tolerationValue: string;
const awsBucket = 'BUCKET_3' as const;
const projectUuid = generateTestUUID();
const hardwareProfileUuid = generateTestUUID();

describe('Notebooks - tolerations tests', () => {
  retryableBefore(() => {
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('Error: secrets "ds-pipeline-config" already exists')) {
        return false;
      }
      return true;
    });
    // Setup: Load test data and ensure clean state
    return loadModelTolerationsFixture('e2e/hardwareProfiles/testModelServingTolerations.yaml')
      .then((fixtureData: ModelTolerationsTestData) => {
        testData = fixtureData;
        projectName = `${testData.modelServingTolerationsTestNamespace}-${projectUuid}`;
        contributor = LDAP_CONTRIBUTOR_USER.USERNAME;
        modelName = testData.modelName;
        modelFilePath = testData.modelFilePath;
        hardwareProfileResourceName = `${testData.hardwareProfileName}-${hardwareProfileUuid}`;
        tolerationValue = testData.tolerationValue;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);

        // Load Hardware Profile
        cy.log(`Loaded Hardware Profile Name: ${hardwareProfileResourceName}`);
        // Cleanup Hardware Profile if it already exists
        createCleanHardwareProfile(testData.resourceYamlPath);

        // Create a Project for pipelines
        provisionProjectForModelServing(
          projectName,
          awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
        addUserToProject(projectName, contributor, 'edit');
      });
  });

  //Cleanup: Delete Hardware Profile and the associated Project
  after(() => {
    // Load Hardware Profile
    cy.log(`Loaded Hardware Profile Name: ${hardwareProfileResourceName}`);

    // Call cleanupHardwareProfiles here, after hardwareProfileResourceName is set
    return cleanupHardwareProfiles(hardwareProfileResourceName).then(() => {
      // Delete provisioned Project
      if (projectName) {
        cy.log(`Deleting Project ${projectName} after the test has finished.`);
        deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
      }
    });
  });

  it(
    'Verify Model Serving Creation using Hardware Profiles and applying Tolerations',
    // TODO: Add the below tags once this feature is enabled in 2.20+
    //  { tags: ['@Sanity', '@SanitySet2', '@Dashboard'] },
    { tags: ['@Featureflagged', '@HardwareProfileModelServing', '@HardwareProfiles'] },
    () => {
      cy.log('Model Name:', modelName);
      // Authentication and navigation
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      // Project navigation, add user and provide contributor permissions
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      // Navigate to Model Serving tab and Deploy a Single Model
      cy.step('Navigate to Model Serving and click to Deploy a Single Model');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.findSingleServingModelButton().click();
      modelServingGlobal.findDeployModelButton().click();

      // Launch a Single Serving Model and select the required entries
      cy.step(
        'Launch a Single Serving Model using Caikit TGIS ServingRuntime for KServe and by selecting the Hardware Profile',
      );
      inferenceServiceModal.findModelNameInput().type(modelName);
      inferenceServiceModal.findServingRuntimeTemplate().click();
      inferenceServiceModal.findCalkitTGISServingRuntime().click();

      inferenceServiceModal.selectPotentiallyDisabledProfile(
        testData.hardwareProfileDeploymentSize,
        hardwareProfileResourceName,
      );
      inferenceServiceModal.findLocationPathInput().type(modelFilePath);
      inferenceServiceModal.findSubmitButton().click();

      //Verify the model created
      cy.step('Verify that the Model is created Successfully on the backend and frontend');
      checkInferenceServiceState(modelName);
      modelServingSection.findModelServerName(modelName);
      // Note reload is required as status tooltip was not found due to a stale element
      cy.reload();
      attemptToClickTooltip();

      // Validate that the toleration applied earlier displays in the newly created pod
      cy.step('Validate the Tolerations for the pod include the newly added toleration');
      validateInferenceServiceTolerations(
        projectName,
        modelName, // InferenceService name
        {
          key: 'test-taint',
          operator: 'Equal',
          effect: tolerationValue,
        },
      ).then(() => {
        cy.log(`✅ Toleration value "${tolerationValue}" displays in the pod as expected`);
      });
    },
  );
});
