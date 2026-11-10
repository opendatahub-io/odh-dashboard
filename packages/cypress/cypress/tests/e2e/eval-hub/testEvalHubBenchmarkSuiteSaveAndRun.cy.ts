import { createEvalHubBenchmarkSuiteScenario } from '../../../utils/evalHubBenchmarkSuiteScenarios';
import { retryableBefore } from '../../../utils/retryableHooks';

const scenario = createEvalHubBenchmarkSuiteScenario('save-and-run');

describe('Eval Hub E2E — Benchmark Collection Save and Run', () => {
  retryableBefore(scenario.setup);

  after(scenario.cleanup);

  it(
    'Eval Hub: create a benchmark collection and run it immediately',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHub', '@Featureflagged'],
    },
    scenario.run,
  );
});
