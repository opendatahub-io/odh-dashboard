import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutoragTestData } from '../../../types';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
import { autoragResultsPage } from '../../../pages/autorag/resultsPage';
import { isAutoragEnabled, setAutoragEnabled } from '../../../utils/oc_commands/autoX';
import {
  cleanupAutoragInfrastructure,
  cleanupAutoragMaaSCredential,
  provisionVectorDatabase,
} from '../../../utils/oc_commands/autoragInfra';
import {
  configureAutoragRun,
  checkAutoragMaaSReadiness,
  submitAutoragRun,
  getAutoragInputDataKey,
  verifyAutoragRunTerminated,
  verifyAutoragRunListed,
} from '../../../utils/autoragTestFlows';
import type { AutoragMaaSFixture } from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();

describe('AutoRAG Experiments List and Run Management E2E', () => {
  let testData: AutoragTestData;
  let projectName: string;
  let maasFixture: AutoragMaaSFixture | undefined;
  let autoragWasEnabled = false;
  const getMaaSFixture = (): AutoragMaaSFixture => {
    if (!maasFixture) {
      throw new Error('AutoRAG MaaS fixture was not resolved.');
    }
    return maasFixture;
  };

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
      .then((fixture) => {
        maasFixture = fixture;
        provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
        provisionVectorDatabase(projectName);
      }),
  );

  after(() => {
    if (!autoragWasEnabled) {
      setAutoragEnabled(false);
    }
    cleanupAutoragInfrastructure(projectName, testData.maasSecretName, testData.vectorDbSecretName);
    if (maasFixture) {
      cleanupAutoragMaaSCredential(maasFixture);
    }
    deleteS3TestFiles(projectName, testData.awsBucket, `*${uuid}*`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Can submit a run, verify it in experiments list, and stop it',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(testData, projectName, uuid, getMaaSFixture(), {
        createConnections: true,
      });

      cy.step('Set max RAG patterns to minimize run time');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(testData, getAutoragInputDataKey(testData, uuid), getMaaSFixture()).then(
        (runId) => {
          cy.step('Terminate the submitted run and confirm');
          autoragResultsPage.findStopRunButton().click();
          autoragResultsPage.findStopRunModal().should('be.visible');
          autoragResultsPage.findConfirmStopRunButton().click();

          cy.step('Verify the submitted run reaches a terminal state');
          verifyAutoragRunTerminated(runId);
          verifyAutoragRunListed(projectName, testData.runName);
        },
      );
    },
  );
});
