import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { createOgxSecret } from '../../../utils/oc_commands/ogxSecret';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutoragTestData } from '../../../types';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
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
} from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();
const faithUuid = `${uuid}-faith`;

const isExternalOgx = (): boolean => !!(Cypress.env('OGX_URL') as string);

describe('AutoRAG Metric Variations E2E', { testIsolation: false }, () => {
  let testData: AutoragTestData;
  let projectName: string;
  let autoragWasEnabled = false;
  let selfProvisioned = false;

  retryableBefore(() =>
    cy
      .fixture('e2e/autorag/testAutoragMetricVariations.yaml', 'utf8')
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
    'Can submit a run with answer_correctness metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(testData, projectName, uuid);

      cy.step('Select answer_correctness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('answer_correctness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun();
      verifyAutoragRunSubmitted(projectName, testData.runName);
    },
  );

  it(
    'Can submit a run with faithfulness metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(
        { ...testData, runName: `${testData.runName}-faith` },
        projectName,
        faithUuid,
      );

      cy.step('Select faithfulness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('faithfulness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun();
      verifyAutoragRunSubmitted(projectName, `${testData.runName}-faith`);
    },
  );
});
