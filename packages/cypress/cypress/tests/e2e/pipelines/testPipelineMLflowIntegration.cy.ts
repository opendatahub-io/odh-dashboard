import { cleanupTestProject } from '../../../utils/projectChecker';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { projectListPage, projectDetails } from '../../../pages/projects';
import {
  pipelineRunsGlobal,
  activeRunsTable,
  pipelinesGlobal,
  pipelineDetails,
} from '../../../pages/pipelines';
import { provisionProjectForPipelines } from '../../../utils/pipelines';
import { waitForDspaReady } from '../../../utils/oc_commands/dspa';
import { getIrisPipelinePath } from '../../../utils/fileImportUtils';
import { createDsPipelineCustomEnvVarsConfigMap } from '../../../utils/oc_commands/configmap';
import {
  disableMlflowFeatures,
  enableMlflowFeatures,
  waitForDashboardSession,
  waitForDspaApiServerPodReady,
  waitForDspaWebhookReady,
  waitForMlflowBffConfigured,
} from '../../../utils/oc_commands/mlflow';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { loadMlflowPipelineIntegrationFixture } from '../../../utils/dataLoader';
import {
  MLFLOW_UI_TIMEOUT_MS,
  fillAndSubmitMlflowIrisRun,
  importMlflowPipelineFromFile,
  createMlflowRunFromPipelineDetails,
  expectMlflowCompareRunsRedirect,
  waitForMlflowCompareRunsButton,
  waitForMlflowExperimentLink,
} from '../../../utils/mlflowPipelineTestFlows';
import type { MlflowPipelineIntegrationTestData } from '../../../types';

const uuid = generateTestUUID();
const awsBucket = 'BUCKET_2' as const;
const tags = [
  '@Smoke',
  '@SmokeSet4',
  '@Pipelines',
  '@MLflow',
  '@MLflowIntegration',
  '@Dashboard',
  '@NonConcurrent',
] as const;

const BASE_RUN_TIMEOUT_MS = 240000;
const DSPA_READY_TIMEOUT_MS = 600000;
const DSPA_POD_TIMEOUT_MS = 310000;

describe(
  'An admin user can configure MLflow experiment tracking for a pipeline server',
  { testIsolation: false },
  () => {
    let testData: MlflowPipelineIntegrationTestData;
    let projectName = '';

    retryableBefore(() => {
      loadMlflowPipelineIntegrationFixture('e2e/pipelines/testPipelineMLflowIntegration.yaml').then(
        (fixtureData: MlflowPipelineIntegrationTestData) => {
          testData = fixtureData;
          projectName = `${testData.projectNamePrefix}-${uuid}`;

          cy.step('Enable the shared MLflow backend required for pipeline integration');
          enableMlflowFeatures();
          cy.step('Provision a project with a pipeline server (DSPA)');
          provisionProjectForPipelines(projectName, testData.dspaSecretName, awsBucket, undefined, {
            integrationMode: 'AUTODETECT',
            pipelineStore: 'kubernetes',
          });
          createDsPipelineCustomEnvVarsConfigMap(projectName);
          waitForDspaReady(projectName, DSPA_READY_TIMEOUT_MS);
          waitForDspaWebhookReady(projectName, DSPA_READY_TIMEOUT_MS);
          waitForDspaApiServerPodReady(projectName, DSPA_POD_TIMEOUT_MS);
        },
      );
    });

    after(() => {
      if (projectName) {
        cleanupTestProject(projectName);
      }
      disableMlflowFeatures();
    });

    it('MLflow autodetect: create and compare iris pipeline runs', { tags: [...tags] }, () => {
      cy.step(`Navigate to project ${projectName}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      waitForDashboardSession();
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Wait for the pipeline server (DSPA) and MLflow webhook to be ready');
      waitForDspaReady(projectName, DSPA_READY_TIMEOUT_MS);
      waitForDspaWebhookReady(projectName, DSPA_READY_TIMEOUT_MS);
      waitForDspaApiServerPodReady(projectName, DSPA_POD_TIMEOUT_MS);

      cy.step('Ensure Import Pipeline button is loaded');
      projectDetails.ensureImportPipelineButtonLoaded();

      cy.step('Import the iris pipeline');
      pipelinesGlobal.visit(projectName, MLFLOW_UI_TIMEOUT_MS);
      waitForMlflowBffConfigured(MLFLOW_UI_TIMEOUT_MS);
      importMlflowPipelineFromFile(
        testData.pipelineName,
        testData.pipelineDescription,
        getIrisPipelinePath(),
      );

      cy.step('Create iris run 1 with a new MLflow experiment');
      pipelineDetails.selectActionDropdownItem('Create run');
      fillAndSubmitMlflowIrisRun(
        testData.run1,
        testData.experimentName,
        { newExperimentName: testData.mlflowExperimentName },
        projectName,
        BASE_RUN_TIMEOUT_MS,
      );

      cy.step('Create iris run 2 reusing the MLflow experiment');
      createMlflowRunFromPipelineDetails(testData.pipelineName, projectName);
      fillAndSubmitMlflowIrisRun(
        testData.run2,
        testData.experimentName,
        { existingExperimentName: testData.mlflowExperimentName },
        projectName,
        BASE_RUN_TIMEOUT_MS,
      );

      cy.step('Compare both iris runs via MLflow');
      pipelineRunsGlobal.visit(projectName, 'active');
      waitForMlflowExperimentLink(testData.run1.name);
      waitForMlflowExperimentLink(testData.run2.name);
      activeRunsTable.getRowByName(testData.run1.name).findCheckbox().click();
      activeRunsTable.getRowByName(testData.run2.name).findCheckbox().click();
      waitForMlflowCompareRunsButton();
      pipelineRunsGlobal.findCompareRunsButton().click();
      expectMlflowCompareRunsRedirect(projectName, { exactRunCount: 2 });
    });
  },
);
