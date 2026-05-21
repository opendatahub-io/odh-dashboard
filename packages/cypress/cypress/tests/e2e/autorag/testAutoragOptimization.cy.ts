import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { createOgxSecret } from '../../../utils/oc_commands/ogxSecret';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { autoragConfigurePage, autoragResultsPage } from '../../../pages/autorag';
import { isAutoragEnabled, setAutoragEnabled } from '../../../utils/oc_commands/autoX';
import { allowOgxAccess, removeOgxAccess } from '../../../utils/oc_commands/ogxNetworkPolicy';
import {
  ensureOgxOperator,
  isOgxOperatorManaged,
  resetOgxOperator,
  provisionAutoragInfrastructure,
  cleanupAutoragInfrastructure,
} from '../../../utils/oc_commands/autoragInfra';
import type { AutoragTestData } from '../../../types';

const uuid = generateTestUUID();

/**
 * Whether to self-provision OGX infrastructure (models, Milvus, OGX Distribution).
 * When OGX_URL is set, we use an external OGX instance (no provisioning).
 * When empty/unset, we provision everything programmatically.
 */
const isExternalOgx = (): boolean => !!(Cypress.env('OGX_URL') as string);

describe('AutoRAG Optimization E2E', { testIsolation: false }, () => {
  let testData: AutoragTestData;
  let projectName: string;
  let autoragWasEnabled = false;
  let selfProvisioned = false;
  let operatorWasManaged = false;

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
        isOgxOperatorManaged().then((wasManaged) => {
          operatorWasManaged = wasManaged;
        }),
      )
      .then(() => {
        if (isExternalOgx()) {
          // External mode: use pre-existing OGX instance
          provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
          allowOgxAccess(projectName);

          const ogxUrl = Cypress.env('OGX_URL') as string;
          const ogxApiKey = (Cypress.env('OGX_API_KEY') as string) || '';
          createOgxSecret(projectName, testData.ogxSecretName, ogxUrl, ogxApiKey);
        } else {
          // Self-provisioned mode: deploy models, Milvus, OGX Distribution
          selfProvisioned = true;

          cy.step('Ensure OGX operator is Managed');
          ensureOgxOperator();

          cy.step('Provision project with DSPA');
          provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);

          cy.step('Provision AutoRAG infrastructure (models, Milvus, OGX)');
          provisionAutoragInfrastructure(projectName, testData.ogxSecretName);
        }
      }),
  );

  after(() => {
    if (!autoragWasEnabled) {
      setAutoragEnabled(false);
    }

    // Explicit cleanup of each resource (resilient — each call ignores errors)
    if (selfProvisioned) {
      cleanupAutoragInfrastructure(projectName, testData.ogxSecretName);
    }

    removeOgxAccess(projectName);
    deleteS3TestFiles(projectName, testData.awsBucket, `*${uuid}*`);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });

    // Restore operator to previous state if we changed it
    if (selfProvisioned && !operatorWasManaged) {
      resetOgxOperator();
    }
  });

  it(
    'Can create and submit a full AutoRAG optimization run',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      autoragConfigurePage.submitRunSetup(testData, projectName, uuid);

      cy.step('Set max RAG patterns to minimize run time');
      autoragConfigurePage.setMaxRagPatterns(testData.maxRagPatterns);

      autoragConfigurePage.submitRun();
    },
  );

  it(
    'Verify optimization run completes with leaderboard',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      cy.step('Wait for run to complete and verify leaderboard');
      autoragResultsPage.waitForRunCompletion();
    },
  );

  it(
    'Can interact with results page (leaderboard, pattern details, download)',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      autoragResultsPage.verifyResultsInteraction();
    },
  );
});
