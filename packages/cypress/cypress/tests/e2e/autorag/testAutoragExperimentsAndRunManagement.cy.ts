import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { createMaasSecret, getMaasConnection } from '../../../utils/oc_commands/maasSecret';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutoragTestData } from '../../../types';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
import { autoragResultsPage } from '../../../pages/autorag/resultsPage';
import { isAutoragEnabled, setAutoragEnabled } from '../../../utils/oc_commands/autoX';
import {
  cleanupAutoragInfrastructure,
  provisionVectorDatabase,
} from '../../../utils/oc_commands/autoragInfra';
import {
  configureAutoragRun,
  checkAutoragMaaSReadiness,
  submitAutoragRun,
  verifyAutoragRunSubmitted,
  verifyAutoragRunStopped,
} from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();

describe('AutoRAG Experiments List and Run Management E2E', () => {
  let testData: AutoragTestData;
  let projectName: string;
  let autoragWasEnabled = false;

  retryableBefore(() =>
    cy
      .fixture('e2e/autorag/testAutoragExperimentsAndRunManagement.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutoragTestData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
      })
      .then(() =>
        isAutoragEnabled().then((wasEnabled) => {
          autoragWasEnabled = wasEnabled;
        }),
      )
      .then(() => setAutoragEnabled(true))
      .then(() => checkAutoragMaaSReadiness())
      .then(() => {
        const connection = getMaasConnection();
        provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
        createMaasSecret(projectName, testData.maasSecretName, connection.url, connection.apiKey);
        provisionVectorDatabase(projectName, testData.vectorDbSecretName);
      }),
  );

  after(() => {
    if (!autoragWasEnabled) {
      setAutoragEnabled(false);
    }
    cleanupAutoragInfrastructure(projectName, testData.maasSecretName, testData.vectorDbSecretName);
    deleteS3TestFiles(projectName, testData.awsBucket, `*${uuid}*`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Can submit a run, verify it in experiments list, and stop it',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(testData, projectName, uuid);

      cy.step('Set max RAG patterns to minimize run time');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun();
      verifyAutoragRunSubmitted(projectName, testData.runName);

      cy.step('Click on the run to go to results page');
      autoragResultsPage.findRunsTable().contains(testData.runName).click();

      cy.step('Verify run is in progress');
      autoragResultsPage.findRunInProgressMessage().should('be.visible');

      cy.step('Click stop button and confirm');
      autoragResultsPage.findStopRunButton().click();
      autoragResultsPage.findStopRunModal().should('be.visible');
      autoragResultsPage.findConfirmStopRunButton().click();

      verifyAutoragRunStopped(projectName);

      cy.step('Verify run status shows as canceled or failed');
      autoragResultsPage.findRunStatusLabel(80000).should('exist');
    },
  );
});
