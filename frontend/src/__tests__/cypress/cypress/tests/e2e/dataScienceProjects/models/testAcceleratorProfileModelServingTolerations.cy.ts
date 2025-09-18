import type { DataScienceProjectData } from '#~/__tests__/cypress/cypress/types';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { LDAP_CONTRIBUTOR_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  modelServingGlobal,
  inferenceServiceModal,
  modelServingSection,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import {
  provisionProjectForModelServing,
  validateInferenceServiceTolerations,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  cleanupAcceleratorProfiles,
  createAcceleratorProfile,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/acceleratorProfiles';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

let projectData: DataScienceProjectData;
let projectName: string;
let modelName: string;
let modelFilePath: string;
let acceleratorProfileName: string;
const awsBucket = 'BUCKET_3';
const uuid = generateTestUUID();

describe('[Bug: RHOAIENG-33131] Verify Model Serving Creation using Accelerator Profiles and applying Tolerations', () => {
  retryableBefore(() => {
    return loadDSPFixture('e2e/dataScienceProjects/testSingleModelContributorCreation.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        projectData = fixtureData;
        projectName = `${projectData.projectSingleModelResourceName}-${uuid}`;
        modelName = projectData.singleModelName;
        modelFilePath = projectData.modelFilePath;
        acceleratorProfileName = `cypress-accelerator-profile-model-${uuid}`;
        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        provisionProjectForModelServing(
          projectName,
          awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
      },
    );
  });

  after(() => {
    // Clean up accelerator profile and project
    cleanupAcceleratorProfiles(acceleratorProfileName);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true });
  });

  it(
    'Verify that a Model can be deployed with Accelerator Profile tolerations',
    {
      tags: [
        '@Sanity',
        '@SanitySet3',
        '@ModelServing',
        '@AcceleratorProfiles',
        '@NonConcurrent',
        '@Bug',
      ],
    },
    () => {
      cy.log('Model Name:', modelName);
      // Create accelerator profile
      cy.step('Create accelerator profile for testing');
      cy.log(`Creating Accelerator Profile: ${acceleratorProfileName}`);
      createAcceleratorProfile('resources/acceleratorProfile/acceleratorProfile.yaml');
      // Authentication and navigation
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);
      // Project navigation - direct navigation to avoid project list sync issues
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      // Navigate to Model Serving tab and Deploy a Single Model
      cy.step('Navigate to Model Serving and click to Deploy a Single Model');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.findSingleServingModelButton().click();
      modelServingGlobal.findDeployModelButton().click();
      inferenceServiceModal.shouldBeOpen();
      inferenceServiceModal.findModelNameInput().type(modelName);
      inferenceServiceModal.findServingRuntimeTemplateSearchSelector().click();
      inferenceServiceModal.findGlobalScopedTemplateOption('OpenVINO Model Server').click();
      inferenceServiceModal.findModelFrameworkSelect().click();
      inferenceServiceModal.findOpenVinoIROpSet13().click();
      inferenceServiceModal.findLocationPathInput().type(modelFilePath);
      // Select the accelerator profile
      cy.step('Select the accelerator profile with tolerations');
      // Select our test accelerator profile
      inferenceServiceModal.selectAcceleratorProfileOption('cypress-accelerator-profile-model');
      // Verify the accelerator profile is selected
      inferenceServiceModal
        .findAcceleratorProfileSelect()
        .should('contain', 'cypress-accelerator-profile-model');
      // Submit the form
      inferenceServiceModal.findSubmitButton().should('be.enabled').click();
      inferenceServiceModal.shouldBeOpen(false);
      modelServingSection.findModelServerDeployedName(modelName);
      // Validate that the toleration applied from the accelerator profile displays in the inference service
      cy.step(
        'Validate the Tolerations for the InferenceService include the accelerator profile toleration',
      );
      validateInferenceServiceTolerations(projectName, modelName, {
        key: 'nvidia.com/gpu',
        operator: 'Equal',
        effect: 'NoSchedule',
      }).then(() => {
        cy.log('Accelerator profile toleration displays in the InferenceService as expected');
      });
    },
  );
});
