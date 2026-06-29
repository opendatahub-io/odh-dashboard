import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { createOgxSecret } from '../../../utils/oc_commands/ogxSecret';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
import { autoragResultsPage } from '../../../pages/autorag/resultsPage';
import { isAutoragEnabled, setAutoragEnabled } from '../../../utils/oc_commands/autoX';
import { allowOgxAccess, removeOgxAccess } from '../../../utils/oc_commands/ogxNetworkPolicy';
import {
  isOgxOperatorManaged,
  provisionAutoragInfrastructure,
  cleanupAutoragInfrastructure,
} from '../../../utils/oc_commands/autoragInfra';
import type { AutoragTestData } from '../../../types';
import {
  configureAutoragRun,
  submitAutoragRun,
  verifyAutoragRunSubmitted,
  waitForAutoragRunCompletion,
  verifyAutoragResultsInteraction,
} from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();

/**
 * When OGX_URL is set, we use an external OGX instance (regression testing).
 * When empty/unset, we self-provision infrastructure (CI mode) — requires
 * the OGX operator to already be Managed on the cluster.
 */
const isExternalOgx = (): boolean => !!(Cypress.env('OGX_URL') as string);

describe('AutoRAG Optimization E2E', { testIsolation: false }, () => {
  let testData: AutoragTestData;
  let projectName: string;
  let autoragWasEnabled = false;
  let selfProvisioned = false;

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

            cy.step('Provision AutoRAG infrastructure (vector store, OGX)');
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
