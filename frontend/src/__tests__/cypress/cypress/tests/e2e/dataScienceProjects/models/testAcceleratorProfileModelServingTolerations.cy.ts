import type { AcceleratorProfilesModelTolerationsTestData } from '#~/__tests__/cypress/cypress/types';
import {
  addUserToProject,
  deleteOpenShiftProject,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { loadAcceleratorProfileModelTolerationsFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
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
import { createCleanProject } from '../../../../utils/projectChecker.ts';

let testData: AcceleratorProfilesModelTolerationsTestData;
let projectName: string;
let contributor: string;
let modelName: string;
let modelFilePath: string;
let acceleratorProfileResourceName: string;
const awsBucket = 'BUCKET_3' as const;
const projectUuid = generateTestUUID();

describe('[Bug: RHOAIENG-33131] Verify Model Serving Creation using Accelerator Profiles and applying Tolerations', () => {
  retryableBefore(() => {
    return loadAcceleratorProfileModelTolerationsFixture(
      'e2e/acceleratorProfiles/testAcceleratorProfileModelServingTolerations.yaml',
    )
      .then((fixtureData: AcceleratorProfilesModelTolerationsTestData) => {
        testData = fixtureData;
        projectName = `${testData.modelServingTolerationsTestNamespace}-${projectUuid}`;
        contributor = LDAP_CONTRIBUTOR_USER.USERNAME;
        modelName = testData.modelName;
        modelFilePath = testData.modelFilePath;
        acceleratorProfileResourceName = testData.acceleratorProfileName;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);
        cy.log(`Load Accelerator Profile: ${acceleratorProfileResourceName}`);
        createAcceleratorProfile(testData.resourceYamlPath);

        provisionProjectForModelServing(
          projectName,
          awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
        addUserToProject(projectName, contributor, 'edit');
      });
  });

  after(() => {
    // Clean up accelerator profile and project
    cleanupAcceleratorProfiles(acceleratorProfileResourceName).then(() => {
      if (projectName) {
        cy.log(`Deleting Project ${projectName} after the test has finished.`);
        deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
      }
    });
  });

  it(
    'Verify that a Model can be deployed with Accelerator Profile tolerations',
    {
      tags: ['@Sanity', '@SanitySet2', '@Dashboard', '@ModelServing', '@AcceleratorProfiles'],
    },
    () => {
      cy.log('Model Name:', modelName);
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
      cy.step('Select the accelerator profile with tolerations');
      inferenceServiceModal.selectAcceleratorProfileOption(acceleratorProfileResourceName);
      inferenceServiceModal
        .findAcceleratorProfileSelect()
        .should('contain', acceleratorProfileResourceName);
      inferenceServiceModal.findLocationPathInput().type(modelFilePath);

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
