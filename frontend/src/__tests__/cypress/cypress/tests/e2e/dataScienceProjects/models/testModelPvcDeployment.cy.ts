import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import { AWS_BUCKETS } from '#~/__tests__/cypress/cypress/utils/s3Buckets';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
  verifyS3CopyCompleted,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { projectListPage, projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import type {
  DataScienceProjectData,
  PVCLoaderPodReplacements,
} from '#~/__tests__/cypress/cypress/types';
import {
  clusterStorage,
  addClusterStorageModal,
} from '#~/__tests__/cypress/cypress/pages/clusterStorage';
import { createS3LoaderPod } from '#~/__tests__/cypress/cypress/utils/oc_commands/pvcLoaderPod';
import { waitForPodCompletion } from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
let modelFilePath: string;
let pvStorageName: string;
const awsBucket = 'BUCKET_1' as const;
const awsAccessKeyId = AWS_BUCKETS.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = AWS_BUCKETS.AWS_SECRET_ACCESS_KEY;
const awsBucketName = AWS_BUCKETS.BUCKET_1.NAME;
const awsBucketEndpoint = AWS_BUCKETS.BUCKET_1.ENDPOINT;
const awsBucketRegion = AWS_BUCKETS.BUCKET_1.REGION;
const podName = 'pvc-loader-pod';
const uuid = generateTestUUID();

describe('Verify a model can be deployed from a PVC', () => {
  retryableBefore(() => {
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('Error: secrets "ds-pipeline-config" already exists')) {
        return false;
      }
      return true;
    });
    return loadDSPFixture('e2e/dataScienceProjects/testModelPvcDeployment.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = testData.singleModelName;
        modelFilePath = testData.modelOpenVinoExamplePath;
        pvStorageName = testData.pvStorageName;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        // Create a Project for pipelines
        provisionProjectForModelServing(projectName, awsBucket);
      },
    );
  });
  after(() => {
    // Delete provisioned Project
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });
  it(
    'should deploy a model from a PVC',
    { tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@ModelServing'] },
    () => {
      cy.step(`log into application with ${HTPASSWD_CLUSTER_ADMIN_USER.USERNAME}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to the project
      cy.step('Navigate to the project');
      projectListPage.visit();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      // Navigate to cluster storage page
      cy.step('Navigate to cluster storage page');
      projectDetails.findSectionTab('cluster-storages').click();
      clusterStorage.findCreateButton().click();

      // Enter cluster storage details
      cy.step('Enter cluster storage details');
      addClusterStorageModal.findNameInput().clear().type(pvStorageName);

      addClusterStorageModal.findModelStorageRadio().click();
      addClusterStorageModal.findModelPathInput().clear().type(modelFilePath);
      addClusterStorageModal.findModelNameInput().clear().type(modelName);

      addClusterStorageModal.findSubmitButton().click({ force: true });

      // Verify the cluster storage is created
      const pvcRow = clusterStorage.getClusterStorageRow(pvStorageName);
      pvcRow.find().should('exist');
      pvcRow.findStorageTypeColumn().should('contain', 'Model storage');

      const pvcReplacements: PVCLoaderPodReplacements = {
        NAMESPACE: projectName,
        PVC_NAME: pvStorageName,
        AWS_S3_BUCKET: awsBucketName,
        AWS_S3_ENDPOINT: awsBucketEndpoint,
        AWS_ACCESS_KEY_ID: awsAccessKeyId,
        AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
        AWS_DEFAULT_REGION: awsBucketRegion,
        POD_NAME: podName,
        MODEL_PATH: modelFilePath,
      };

      // Create pod to mount the PVC
      cy.step('Create pod to mount the PVC');
      createS3LoaderPod(pvcReplacements);

      // Verify the pod completes successfully
      cy.step('Verify the pod completes successfully');
      waitForPodCompletion(podName, '300s', projectName);

      // Verify the S3 copy completed successfully
      cy.step('Verify S3 copy completed');
      verifyS3CopyCompleted(podName, projectName);

      // Deploy the model
      cy.step('Deploy the model');
      projectDetails.findSectionTab('model-server').click();
      // If we have only one serving model platform, then it is selected by default.
      // So we don't need to click the button.
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();
      // Step 1: Model Source
      modelServingWizard.findModelLocationSelectOption('Cluster storage').click();
      // There's only one PVC so it's automatically selected
      modelServingWizard.findPVCSelectValue().should('have.value', pvStorageName);
      modelServingWizard.findModelTypeSelectOption('Predictive model').click();
      modelServingWizard.findNextButton().click();
      // Step 2: Model Deployment
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
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
      //Step 3: Advanced Options
      modelServingWizard.findNextButton().click();
      //Step 4: Review
      modelServingWizard.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(testData.singleModelName);
      //Verify the model created and is running
      cy.step('Verify that the Model is running');
      // Verify model deployment is ready
      checkInferenceServiceState(testData.singleModelName, projectName, { checkReady: true });
    },
  );
});
