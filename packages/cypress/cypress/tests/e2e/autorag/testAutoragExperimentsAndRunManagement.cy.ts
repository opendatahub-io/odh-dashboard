import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { createOgxSecret } from '../../../utils/oc_commands/ogxSecret';
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
} from '../../../utils/oc_commands/autoragInfra';
import {
  configureAutoragRun,
  submitAutoragRun,
  verifyAutoragRunSubmitted,
  verifyAutoragRunStopped,
} from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();

const isExternalOgx = (): boolean => !!(Cypress.env('OGX_URL') as string);

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
          if (isExternalOgx()) {
            provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
            allowOgxAccess(projectName);

            const ogxUrl = Cypress.env('OGX_URL') as string;
            const ogxApiKey = (Cypress.env('OGX_API_KEY') as string) || '';
            createOgxSecret(projectName, testData.ogxSecretName, ogxUrl, ogxApiKey);
          } else {
            if (!isManaged) {
              throw new Error(
                'OGX operator is not Managed on this cluster. ' +
                  'Either set OGX_URL for external mode or ensure the operator is Managed.',
              );
            }

            selfProvisioned = true;

            cy.step('Provision project with DSPA');
            provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);

            cy.step('Provision AutoRAG infrastructure (models, Milvus, OGX)');
            provisionAutoragInfrastructure(projectName, testData.ogxSecretName);
          }
        }),
      ),
  );

  after(() => {
    if (!autoragWasEnabled) {
      setAutoragEnabled(false);
    }
    if (selfProvisioned) {
      cleanupAutoragInfrastructure(projectName, testData.ogxSecretName);
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
