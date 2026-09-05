import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import {
  createMaasSecret,
  isExternalMaasConnection,
  getExternalMaasConnection,
} from '../../../utils/oc_commands/maasSecret';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutoragTestData } from '../../../types';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
import { autoragResultsPage } from '../../../pages/autorag/resultsPage';
import { isAutoragEnabled, setAutoragEnabled } from '../../../utils/oc_commands/autoX';
import { allowOgxAccess, removeOgxAccess } from '../../../utils/oc_commands/ogxNetworkPolicy';
import {
  isOgxOperatorManaged,
  provisionAutoragInfrastructure,
  cleanupAutoragInfrastructure,
  provisionVectorDatabase,
} from '../../../utils/oc_commands/autoragInfra';
import {
  configureAutoragRun,
  submitAutoragRun,
  verifyAutoragRunSubmitted,
  verifyAutoragRunStopped,
} from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();

const isExternalMaas = (): boolean => isExternalMaasConnection();

describe('AutoRAG Experiments List and Run Management E2E', () => {
  let testData: AutoragTestData;
  let projectName: string;
  let autoragWasEnabled = false;
  let selfProvisioned = false;

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
      .then(() =>
        isOgxOperatorManaged().then((isManaged) => {
          if (isExternalMaas()) {
            provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
            allowOgxAccess(projectName);

            const connection = getExternalMaasConnection();
            if (!connection) {
              throw new Error('Expected MAAS_URL or OGX_URL for external mode');
            }
            createMaasSecret(
              projectName,
              testData.maasSecretName,
              connection.url,
              connection.apiKey,
            );
            provisionVectorDatabase(projectName, testData.vectorDbSecretName);
          } else {
            if (!isManaged) {
              throw new Error(
                'OGX operator is not Managed on this cluster. ' +
                  'Either set MAAS_URL or OGX_URL for external mode or ensure the operator is Managed.',
              );
            }

            selfProvisioned = true;

            cy.step('Provision project with DSPA');
            provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);

            cy.step('Provision AutoRAG infrastructure (models, Milvus, OGX)');
            provisionAutoragInfrastructure(
              projectName,
              testData.maasSecretName,
              testData.vectorDbSecretName,
            );
          }
        }),
      ),
  );

  after(() => {
    if (!autoragWasEnabled) {
      setAutoragEnabled(false);
    }
    if (selfProvisioned) {
      cleanupAutoragInfrastructure(
        projectName,
        testData.maasSecretName,
        testData.vectorDbSecretName,
      );
    }
    removeOgxAccess(projectName);
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
