import {
  BreadcrumbSegment,
  buildBreadcrumbsFromMlflowPathQuery,
} from '#~/pages/pipelines/global/mlflowExperiments/breadcrumb/utils';

const ROUTE_PREFIX = '/develop-train/experiments-mlflow';

const labels = (segments: BreadcrumbSegment[]): string[] => segments.map((s) => s.label);

const paths = (segments: BreadcrumbSegment[]): string[] => segments.map((s) => s.path);

describe('buildBreadcrumbsFromMlflowPathQuery', () => {
  describe('compare-runs', () => {
    it('builds breadcrumbs with single experiment in query param', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/compare-runs?experiments=["123"]&runs=["abc","def"]&workspace=default',
      );
      expect(labels(result)).toEqual([
        'Experiments',
        'Experiment 123 runs',
        'Comparing 2 Runs from 1 Experiment',
      ]);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/experiments?workspace=default`,
        `${ROUTE_PREFIX}/experiments/123/runs?workspace=default`,
        `${ROUTE_PREFIX}/compare-runs?experiments=["123"]&runs=["abc","def"]&workspace=default`,
      ]);
    });

    it('builds breadcrumbs with run and experiment count when comparing runs from multiple experiments', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/compare-runs?experiments=["3","4","5","6"]&runs=["abc","def"]&workspace=default',
      );
      expect(labels(result)).toEqual([
        'Experiments',
        'Displaying Runs from 4 Experiments',
        'Comparing 2 Runs from 4 Experiments',
      ]);
      expect(paths(result)[0]).toBe(`${ROUTE_PREFIX}/experiments?workspace=default`);
    });

    it('builds breadcrumbs with invalid JSON in experiments param', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/compare-runs?experiments=invalid-json&workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments']);
      expect(paths(result)[0]).toBe(`${ROUTE_PREFIX}/experiments?workspace=default`);
    });

    it('builds breadcrumbs with single run singular form', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/compare-runs?experiments=["1","2"]&runs=["abc"]&workspace=default',
      );
      expect(labels(result)).toEqual([
        'Experiments',
        'Displaying Runs from 2 Experiments',
        'Comparing 1 Run from 2 Experiments',
      ]);
    });
  });

  describe('compare-experiments', () => {
    it('builds breadcrumbs for compare-experiments with experiment count', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/compare-experiments/s?experiments=["3","4","5","6"]&searchFilter=&workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Displaying Runs from 4 Experiments']);
      expect(paths(result)[0]).toBe(`${ROUTE_PREFIX}/experiments?workspace=default`);
    });

    it('builds breadcrumbs for compare-experiments with single experiment', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/compare-experiments/s?experiments=["1"]&workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Displaying Runs from 1 Experiment']);
    });
  });

  describe('metric', () => {
    it('builds breadcrumbs for metric page with metric name', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/metric/accuracy?workspace=default');
      expect(labels(result)).toEqual(['Experiments', 'accuracy']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/experiments?workspace=default`,
        `${ROUTE_PREFIX}/metric/accuracy?workspace=default`,
      ]);
    });

    it('builds breadcrumbs for metric page with nested path', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/metric/train/loss/epoch?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'train/loss/epoch']);
    });

    it('builds breadcrumbs for metric page without metric name', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/metric?workspace=default');
      expect(labels(result)).toEqual(['Experiments', 'Metric']);
    });
  });

  describe('standalone prompts', () => {
    it('builds breadcrumbs for /prompts/:promptName', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/prompts/myPrompt?workspace=default');
      expect(labels(result)).toEqual(['Prompts', 'myPrompt']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/prompts?workspace=default`,
        `${ROUTE_PREFIX}/prompts/myPrompt?workspace=default`,
      ]);
    });
  });

  describe('standalone runs (direct access)', () => {
    it('builds breadcrumbs for /runs/:runUuid', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/runs/abcd-1234?workspace=default');
      expect(labels(result)).toEqual(['Experiments', 'abcd-1234']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/experiments?workspace=default`,
        `${ROUTE_PREFIX}/runs/abcd-1234?workspace=default`,
      ]);
    });
  });

  describe('experiment + tab combined label', () => {
    it('builds combined label for experiments/:id/runs', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/experiments/123/runs?workspace=default');
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/experiments?workspace=default`,
        `${ROUTE_PREFIX}/experiments/123/runs?workspace=default`,
      ]);
    });

    it('builds combined label for experiments/:id/traces', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/456/traces?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 456 traces']);
    });

    it('builds combined label for experiments/:id/models', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/789/models?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 789 models']);
    });

    it('builds combined label for experiments/:id/prompts', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/prompts?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 prompts']);
    });

    it('builds combined label for experiments/:id/chat-sessions', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/chat-sessions?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 chat sessions']);
    });

    it('builds combined label for experiments/:id/datasets', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/datasets?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 datasets']);
    });

    it('builds combined label for experiments/:id/evaluation-runs', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/evaluation-runs?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 evaluation runs']);
    });

    it('builds combined label for experiments/:id/overview', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/overview?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 overview']);
    });

    it('builds combined label for experiments/:id/overview/quality', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/7/overview/quality?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 7 quality']);
    });

    it('builds combined label for experiments/:id/overview/tool-calls', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/7/overview/tool-calls?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 7 tool calls']);
    });

    it('builds combined label for experiments/:id/judges', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/experiments/7/judges?workspace=default');
      expect(labels(result)).toEqual(['Experiments', 'Experiment 7 judges']);
    });
  });

  describe('run details', () => {
    it('builds breadcrumbs for experiments/:id/runs/:runUuid', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/runs/abcd-5678?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs', 'abcd-5678']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/experiments?workspace=default`,
        `${ROUTE_PREFIX}/experiments/123/runs?workspace=default`,
        `${ROUTE_PREFIX}/experiments/123/runs/abcd-5678?workspace=default`,
      ]);
    });

    it('combines run with overview tab', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/runs/abcd-5678/overview?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs', 'abcd-5678 overview']);
    });

    it('combines run with model-metrics tab', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/runs/abcd-5678/model-metrics?workspace=default',
      );
      expect(labels(result)).toEqual([
        'Experiments',
        'Experiment 123 runs',
        'abcd-5678 model metrics',
      ]);
    });

    it('combines run with system-metrics tab', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/runs/abcd-5678/system-metrics?workspace=default',
      );
      expect(labels(result)).toEqual([
        'Experiments',
        'Experiment 123 runs',
        'abcd-5678 system metrics',
      ]);
    });

    it('combines run with traces tab', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/runs/abcd-5678/traces?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs', 'abcd-5678 traces']);
    });

    it('combines run with artifacts tab', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/runs/abcd-5678/artifacts?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs', 'abcd-5678 artifacts']);
    });

    it('combines run with evaluations tab', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/runs/abcd-5678/evaluations?workspace=default',
      );
      expect(labels(result)).toEqual([
        'Experiments',
        'Experiment 123 runs',
        'abcd-5678 evaluations',
      ]);
    });
  });

  describe('run artifacts special case', () => {
    it('builds breadcrumbs for experiments/:id/runs/:runUuid/artifactPath', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/runs/abcd/artifactPath?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs', 'abcd', 'Artifacts']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/experiments?workspace=default`,
        `${ROUTE_PREFIX}/experiments/123/runs?workspace=default`,
        `${ROUTE_PREFIX}/experiments/123/runs/abcd?workspace=default`,
        `${ROUTE_PREFIX}/experiments/123/runs/abcd/artifactPath?workspace=default`,
      ]);
    });

    it('consumes extra segment after artifactPath without adding extra crumbs', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/runs/abcd/artifactPath/some-file.txt?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs', 'abcd', 'Artifacts']);
    });
  });

  describe('model details + tab under experiments', () => {
    it('builds breadcrumbs for experiments/:id/models/:loggedModelId', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/models/lm-1?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 models', 'lm-1']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/experiments?workspace=default`,
        `${ROUTE_PREFIX}/experiments/123/models?workspace=default`,
        `${ROUTE_PREFIX}/experiments/123/models/lm-1?workspace=default`,
      ]);
    });

    it('builds breadcrumbs for experiments/:id/models/:loggedModelId/:tabName', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/models/lm-1/details?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 models', 'lm-1', 'details']);
    });

    it('builds combined label for experiments/:id/models/:loggedModelId/traces', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/models/lm-1/traces?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 models', 'lm-1 traces']);
    });

    it('builds combined label for experiments/:id/models/:loggedModelId/artifacts', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/models/lm-1/artifacts?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 models', 'lm-1 artifacts']);
    });
  });

  describe('chat-sessions and prompts nested under experiments', () => {
    it('builds breadcrumbs for experiments/:id/chat-sessions/:sessionId', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/chat-sessions/session1?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 chat sessions', 'session1']);
    });

    it('builds breadcrumbs for experiments/:id/prompts/:promptName', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/prompts/promptA?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 prompts', 'promptA']);
    });
  });

  describe('experiment without known tab', () => {
    it('builds breadcrumbs for just experiment id', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/experiments/123?workspace=default');
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/experiments?workspace=default`,
        `${ROUTE_PREFIX}/experiments/123?workspace=default`,
      ]);
    });
  });

  describe('fallback behavior', () => {
    it('handles tab not after an experiment id', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/models/lm-1?workspace=default',
      );
      expect(labels(result).length).toBeGreaterThan(0);
      expect(labels(result)[0]).toBe('Experiments');
    });

    it('handles unknown segments as generic crumbs', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/123/weirdPage?workspace=default',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123', 'weirdPage']);
    });

    it('handles runs not after experiment id', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/runs/abcd?workspace=default',
      );
      expect(labels(result).length).toBeGreaterThan(0);
      expect(labels(result)).toContain('Experiments');
    });
  });

  describe('edge cases', () => {
    it('handles path without workspace', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/experiments/123/runs');
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/experiments`,
        `${ROUTE_PREFIX}/experiments/123/runs`,
      ]);
    });

    it('handles different workspace names', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/experiments/456/runs?workspace=my-workspace',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 456 runs']);
      expect(paths(result)[0]).toBe(`${ROUTE_PREFIX}/experiments?workspace=my-workspace`);
    });
  });
});
