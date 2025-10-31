import type { ModelTolerationsTestData } from '#~/__tests__/cypress/cypress/types';
import {
  addUserToProject,
  deleteOpenShiftProject,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { loadModelTolerationsFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { LDAP_CONTRIBUTOR_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  modelServingGlobal,
  inferenceServiceModal,
  modelServingSection,
  modelServingWizard,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
  validateInferenceServiceTolerations,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { attemptToClickTooltip } from '#~/__tests__/cypress/cypress/utils/models';
import {
  cleanupHardwareProfiles,
  createCleanHardwareProfile,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/hardwareProfiles';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

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

describe('ModelServing - tolerations tests', () => {
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
    // Use the actual hardware profile name from the YAML, not the variable with UUID
    cy.log(`Cleaning up Hardware Profile: ${testData.hardwareProfileName}`);

    // Call cleanupHardwareProfiles with the actual name from the YAML file
    return cleanupHardwareProfiles(testData.hardwareProfileName).then(() => {
      // Delete provisioned Project
      if (projectName) {
        cy.log(`Deleting Project ${projectName} after the test has finished.`);
        return deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
      }
      return cy.wrap(null);
    });
  });

  it(
    'Verify Model Serving Creation using Hardware Profiles and applying Tolerations',
    // TODO: Add the below tags once this feature is enabled in 2.20+
    //  { tags: ['@Sanity', '@SanitySet2', '@Dashboard'] },
    {
      tags: [
        '@HardwareProfileModelServing',
        '@HardwareProfiles',
        '@Dashboard',
        '@Smoke',
        '@SmokeSet3',
      ],
    },
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
      // If we have only one serving model platform, then it is selected by default.
      // So we don't need to click the button.
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      // Launch a Single Serving Model and select the required entries
      cy.step(
        'Launch a Single Serving Model using OpenVINO Model Server and by selecting the Hardware Profile',
      );
      // Step 1: Model Source
      modelServingWizard.findModelLocationSelectOption('Existing connection').click();
      modelServingWizard.findLocationPathInput().clear().type(modelFilePath);
      modelServingWizard.findModelTypeSelectOption('Predictive model').click();
      modelServingWizard.findNextButton().click();
      // Step 2: Model Deployment
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      inferenceServiceModal.selectPotentiallyDisabledProfile(
        testData.hardwareProfileDeploymentSize,
        hardwareProfileResourceName,
      );
      modelServingWizard.findModelFormatSelectOption('openvino_ir - opset13').click();
      // Only interact with serving runtime template selector if it's not disabled
      // (it may be disabled when only one option is available)
      modelServingWizard.findServingRuntimeTemplateSearchSelector().then(($selector) => {
        if (!$selector.is(':disabled')) {
          cy.wrap($selector).click();
          modelServingWizard
            .findGlobalScopedTemplateOption('OpenVINO Model Server')
            .should('exist')
            .click();
        }
      });
      modelServingWizard.findNextButton().click();
      // Step 3: Advanced Options
      modelServingWizard.findNextButton().click();
      // Step 4: Review
      modelServingWizard.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(modelName);

      //Verify the model created
      cy.step('Verify that the Model is created Successfully on the backend and frontend');
      checkInferenceServiceState(modelName, projectName);
      modelServingSection.findModelMetricsLink(modelName);
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
