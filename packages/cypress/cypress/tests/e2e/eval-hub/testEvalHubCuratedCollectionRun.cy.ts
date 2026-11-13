import { createEvalHubBenchmarkSuiteScenario } from '../../../utils/evalHubBenchmarkSuiteScenarios';
import { retryableBefore } from '../../../utils/retryableHooks';

const scenario = createEvalHubBenchmarkSuiteScenario('curated-run');

describe('Eval Hub E2E — Curated Collection Run', () => {
  retryableBefore(scenario.setup);

  after(scenario.cleanup);

  it(
    'Eval Hub: run a curated collection from the Gallery and complete the evaluation',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHub', '@Featureflagged'],
    },
    scenario.runCuratedCollection,
  );
});
