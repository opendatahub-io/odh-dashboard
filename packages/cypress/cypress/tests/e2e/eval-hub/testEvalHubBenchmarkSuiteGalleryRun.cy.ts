import { createEvalHubBenchmarkSuiteScenario } from '../../../utils/evalHubBenchmarkSuiteScenarios';
import { retryableBefore } from '../../../utils/retryableHooks';

const scenario = createEvalHubBenchmarkSuiteScenario('gallery');

describe('Eval Hub E2E — Benchmark Suite Gallery Run', () => {
  retryableBefore(scenario.setup);

  after(scenario.cleanup);

  it(
    'Eval Hub: save a benchmark suite and run it from Evaluate',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHub', '@Featureflagged'],
    },
    scenario.run,
  );
});
