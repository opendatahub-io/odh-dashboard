import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { createLlamaStackSecret } from '../../../utils/oc_commands/llamaStackSecret';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { autoragConfigurePage, autoragResultsPage } from '../../../pages/autorag';
import { isAutoragEnabled, setAutoragEnabled } from '../../../utils/oc_commands/autoX';
import {
  allowLlamaStackAccess,
  removeLlamaStackAccess,
} from '../../../utils/oc_commands/llamaStackNetworkPolicy';
import {
  ensureLlamaStackOperator,
  isLlamaStackOperatorManaged,
  resetLlamaStackOperator,
  provisionAutoragInfrastructure,
  cleanupAutoragInfrastructure,
} from '../../../utils/oc_commands/autoragInfra';
import type { AutoragTestData } from '../../../types';

const uuid = generateTestUUID();

/**
 * Whether to self-provision LlamaStack infrastructure (models, Milvus, LSD).
 * When LLAMA_STACK_URL is set, we use external LlamaStack (no provisioning).
 * When empty/unset, we provision everything programmatically.
 */
const isExternalLlamaStack = (): boolean => !!(Cypress.env('LLAMA_STACK_URL') as string);

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
        isLlamaStackOperatorManaged().then((wasManaged) => {
          operatorWasManaged = wasManaged;
        }),
      )
      .then(() => {
        if (isExternalLlamaStack()) {
          // External mode: use pre-existing LlamaStack instance
          provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
          allowLlamaStackAccess(projectName);

          const llamaStackUrl = Cypress.env('LLAMA_STACK_URL') as string;
          const llamaStackApiKey = (Cypress.env('LLAMA_STACK_API_KEY') as string) || '';
          createLlamaStackSecret(
            projectName,
            testData.llamaStackSecretName,
            llamaStackUrl,
            llamaStackApiKey,
          );
        } else {
          // Self-provisioned mode: deploy models, Milvus, LlamaStack Distribution
          selfProvisioned = true;

          cy.step('Ensure LlamaStack operator is Managed');
          ensureLlamaStackOperator();

          cy.step('Provision project with DSPA');
          provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);

          cy.step('Provision AutoRAG infrastructure (models, Milvus, LSD)');
          provisionAutoragInfrastructure(projectName, testData.llamaStackSecretName);
        }
      }),
  );

  after(() => {
    if (!autoragWasEnabled) {
      setAutoragEnabled(false);
    }

    // Explicit cleanup of each resource (resilient — each call ignores errors)
    if (selfProvisioned) {
      cleanupAutoragInfrastructure(projectName, testData.llamaStackSecretName);
    }

    removeLlamaStackAccess(projectName);
    deleteS3TestFiles(projectName, testData.awsBucket, `*${uuid}*`);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });

    // Restore operator to previous state if we changed it
    if (selfProvisioned && !operatorWasManaged) {
      resetLlamaStackOperator();
    }
  });

  it(
    'Can create and submit a full AutoRAG optimization run',
    { tags: ['@Smoke', '@SmokeSet4', '@AutoRAG', '@AutoRAGCI'] },
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
