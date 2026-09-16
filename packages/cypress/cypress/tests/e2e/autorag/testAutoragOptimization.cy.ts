import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
import { isAutoragEnabled, setAutoragEnabled } from '../../../utils/oc_commands/autoX';
import {
  cleanupAutoragInfrastructure,
  cleanupAutoragMaaSCredential,
  provisionVectorDatabase,
} from '../../../utils/oc_commands/autoragInfra';
import type { AutoragTestData } from '../../../types';
import {
  configureAutoragRun,
  checkAutoragMaaSReadiness,
  submitAutoragRun,
  getAutoragInputDataKey,
  waitForAutoragRunCompletion,
  verifyAutoragResultsInteraction,
} from '../../../utils/autoragTestFlows';
import type { AutoragMaaSFixture } from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();

describe('AutoRAG Optimization E2E', () => {
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
      configureAutoragRun(testData, projectName, uuid, getMaaSFixture(), {
        createConnections: true,
      });

      cy.step('Set max RAG patterns to minimize run time');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(testData, getAutoragInputDataKey(testData, uuid), getMaaSFixture());
    },
  );
});

describe('AutoRAG Optimization completion results E2E', () => {
  const completionUuid = generateTestUUID();
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
      .fixture('e2e/autorag/testAutoragOptimization.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutoragTestData;
        projectName = `${testData.projectNamePrefix}-${completionUuid}`;
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
    deleteS3TestFiles(projectName, testData.awsBucket, `*${completionUuid}*`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Verify optimization run completes and results are interactive',
    {
      tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'],
      retries: { runMode: 0, openMode: 0 },
    },
    () => {
      configureAutoragRun(testData, projectName, completionUuid, getMaaSFixture(), {
        createConnections: true,
      });

      cy.step('Set max RAG patterns to minimize run time');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(
        testData,
        getAutoragInputDataKey(testData, completionUuid),
        getMaaSFixture(),
      ).then(() => {
        waitForAutoragRunCompletion();
        verifyAutoragResultsInteraction();
      });
    },
  );
});
