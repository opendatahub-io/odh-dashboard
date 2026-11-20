import { createEvalHubBenchmarkSuiteScenario } from '../../../utils/evalHubBenchmarkSuiteScenarios';
import {
  editSavedBenchmarkCollection,
  verifySavedBenchmarkCollectionEditDisabled,
} from '../../../utils/evalHubTestFlows';
import { retryableBefore } from '../../../utils/retryableHooks';

const scenario = createEvalHubBenchmarkSuiteScenario('edit');

describe('Eval Hub E2E — Edit a Saved Collection', () => {
  retryableBefore(scenario.setup);

  after(scenario.cleanup);

  it(
    'Eval Hub: edit a saved collection, run it, then disable further edits',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHub', '@Featureflagged'],
    },
    () => {
      const evaluationTenantProject = scenario.getTenantProject();
      const testData = scenario.getTestData();
      const collectionName = scenario.getCreatedSuiteName();
      const evaluationRunName = `e2e-edit-run-${evaluationTenantProject}`;
      const expectedBenchmarkParameters = JSON.parse(testData.additionalBenchmarkParams) as Record<
        string,
        unknown
      >;

      scenario.createSavedCollection();
      editSavedBenchmarkCollection(
        evaluationTenantProject,
        collectionName,
        testData.benchmarks,
        5,
        expectedBenchmarkParameters,
      );
      scenario.runSavedCollection(collectionName, evaluationRunName);
      verifySavedBenchmarkCollectionEditDisabled(evaluationTenantProject, collectionName);
    },
  );
});
