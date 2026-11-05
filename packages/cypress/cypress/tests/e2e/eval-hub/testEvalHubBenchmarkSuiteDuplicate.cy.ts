import { createEvalHubBenchmarkSuiteScenario } from '../../../utils/evalHubBenchmarkSuiteScenarios';
import { duplicateSavedBenchmarkCollection } from '../../../utils/evalHubTestFlows';
import { retryableBefore } from '../../../utils/retryableHooks';

const scenario = createEvalHubBenchmarkSuiteScenario('duplicate');

describe('Eval Hub E2E — Duplicate a Saved Collection', () => {
  retryableBefore(scenario.setup);

  after(scenario.cleanup);

  it(
    'Eval Hub: duplicate a saved collection and add it to My collections',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHub', '@Featureflagged'],
    },
    () => {
      const testData = scenario.getTestData();
      const sourceCollectionName = scenario.getCreatedSuiteName();
      const duplicatedCollectionName = `Duplicate ${sourceCollectionName}`;
      const expectedBenchmarkParameters = JSON.parse(testData.additionalBenchmarkParams) as Record<
        string,
        unknown
      >;

      scenario.createSavedCollection();
      duplicateSavedBenchmarkCollection(
        scenario.getTenantProject(),
        sourceCollectionName,
        duplicatedCollectionName,
        testData.benchmarks,
        expectedBenchmarkParameters,
      );
    },
  );
});
