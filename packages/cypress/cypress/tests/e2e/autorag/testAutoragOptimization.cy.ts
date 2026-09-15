import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { createMaasSecret, getMaasConnection } from '../../../utils/oc_commands/maasSecret';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
import { autoragResultsPage } from '../../../pages/autorag/resultsPage';
import { isAutoragEnabled, setAutoragEnabled } from '../../../utils/oc_commands/autoX';
import {
  cleanupAutoragInfrastructure,
  provisionVectorDatabase,
} from '../../../utils/oc_commands/autoragInfra';
import type { AutoragTestData } from '../../../types';
import {
  configureAutoragRun,
  checkAutoragMaaSReadiness,
  submitAutoragRun,
  verifyAutoragRunSubmitted,
  waitForAutoragRunCompletion,
  verifyAutoragResultsInteraction,
} from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();

describe('AutoRAG Optimization E2E', { testIsolation: false }, () => {
  let testData: AutoragTestData;
  let projectName: string;
  let autoragWasEnabled = false;

  retryableBefore(() =>
    cy
      .fixture('e2e/autorag/testAutoragOptimization.yaml', 'utf8')
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
    'Can configure and submit an AutoRAG optimization run',
    {
      tags: [
        '@AutoRAG',
        '@AutoRAGCI',
        '@AutoRAGRegression',
        '@AutoRAGOptimization',
        '@Featureflagged',
      ],
    },
    () => {
      configureAutoragRun(testData, projectName, uuid);

      cy.step('Set max RAG patterns to minimize run time');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun();
      verifyAutoragRunSubmitted(projectName, testData.runName);
    },
  );

  // Regression only: waits for the run to complete (~30 min) and verifies
  // leaderboard, pattern details, tabs, and notebook download.
  it(
    'Verify optimization run completes and results are interactive',
    {
      tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'],
      retries: { runMode: 0, openMode: 0 },
    },
    () => {
      cy.step('Navigate to the run results page');
      autoragResultsPage.findRunsTable().contains(testData.runName).click();

      waitForAutoragRunCompletion();
      verifyAutoragResultsInteraction();
    },
  );
});
