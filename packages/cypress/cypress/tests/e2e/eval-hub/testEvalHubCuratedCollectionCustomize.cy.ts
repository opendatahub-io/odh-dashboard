import { createEvalHubBenchmarkSuiteScenario } from '../../../utils/evalHubBenchmarkSuiteScenarios';
import { customizeCuratedCollection } from '../../../utils/evalHubTestFlows';
import { retryableBefore } from '../../../utils/retryableHooks';

const scenario = createEvalHubBenchmarkSuiteScenario('curated-customize');

describe('Eval Hub E2E — Curated Collection Customize', () => {
  retryableBefore(scenario.setup);

  after(scenario.cleanup);

  it(
    'Eval Hub: customize a curated collection without a required judge model and complete a run',
    {
      retries: { runMode: 0, openMode: 0 },
      tags: ['@EvalHub', '@Featureflagged'],
    },
    () => {
      const evaluationTenantProject = scenario.getTenantProject();
      const customizedCollectionName = `Tool use customized ${evaluationTenantProject}`;
      const evaluationRunName = `e2e-curated-customize-${evaluationTenantProject}`;

      customizeCuratedCollection(evaluationTenantProject, 'tool-use-v1', customizedCollectionName);
      scenario.runSavedCollection(customizedCollectionName, evaluationRunName);
    },
  );
});
