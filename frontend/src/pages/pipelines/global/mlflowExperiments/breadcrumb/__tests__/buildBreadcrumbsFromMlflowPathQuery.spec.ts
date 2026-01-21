import {
  BreadcrumbSegment,
  buildBreadcrumbsFromMlflowPathQuery,
} from '#~/pages/pipelines/global/mlflowExperiments/breadcrumb/utils';

const ROUTE_PREFIX = '/develop-train/experiments-mlflow';

const labels = (segments: BreadcrumbSegment[]): string[] => segments.map((s) => s.label);

const paths = (segments: BreadcrumbSegment[]): string[] => segments.map((s) => s.path);

describe('buildBreadcrumbsFromMlflowPathQuery', () => {
  describe('returns empty array for root pages', () => {
    it('returns [] for default path /experiments', () => {
      expect(buildBreadcrumbsFromMlflowPathQuery('/experiments')).toEqual([]);
    });

    it('returns [] for experiments list page /workspaces/default/experiments', () => {
      expect(buildBreadcrumbsFromMlflowPathQuery('/workspaces/default/experiments')).toEqual([]);
    });

    it('returns [] for standalone prompts root /workspaces/default/prompts', () => {
      expect(buildBreadcrumbsFromMlflowPathQuery('/workspaces/default/prompts')).toEqual([]);
    });

    it('returns [] for standalone models root /workspaces/default/models', () => {
      expect(buildBreadcrumbsFromMlflowPathQuery('/workspaces/default/models')).toEqual([]);
    });
  });

  describe('compare-runs', () => {
    it('builds breadcrumbs with single experiment in query param', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/compare-runs?experiments=["123"]&runs=["abc","def"]',
      );
      expect(labels(result)).toEqual([
        'Experiments',
        'Experiment 123 runs',
        'Comparing 2 Runs from 1 Experiment',
      ]);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/experiments`,
        `${ROUTE_PREFIX}/workspaces/default/experiments/123/runs`,
        `${ROUTE_PREFIX}/workspaces/default/compare-runs?experiments=["123"]&runs=["abc","def"]`,
      ]);
    });

    it('builds breadcrumbs with run and experiment count when comparing runs from multiple experiments', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/compare-runs?experiments=["3","4","5","6"]&runs=["abc","def"]',
      );
      expect(labels(result)).toEqual([
        'Experiments',
        'Displaying Runs from 4 Experiments',
        'Comparing 2 Runs from 4 Experiments',
      ]);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/experiments`,
        `${ROUTE_PREFIX}/workspaces/default/compare-experiments/s?experiments=${encodeURIComponent(
          '["3","4","5","6"]',
        )}`,
        `${ROUTE_PREFIX}/workspaces/default/compare-runs?experiments=["3","4","5","6"]&runs=["abc","def"]`,
      ]);
    });

    it('builds breadcrumbs with invalid JSON in experiments param', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/compare-runs?experiments=invalid-json',
      );
      expect(labels(result)).toEqual(['Experiments']);
      expect(paths(result)[0]).toBe(`${ROUTE_PREFIX}/workspaces/default/experiments`);
    });

    it('builds breadcrumbs with single run singular form', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/compare-runs?experiments=["1","2"]&runs=["abc"]',
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
        '/workspaces/default/compare-experiments/s?experiments=["3","4","5","6"]&searchFilter=',
      );
      expect(labels(result)).toEqual(['Experiments', 'Displaying Runs from 4 Experiments']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/experiments`,
        `${ROUTE_PREFIX}/workspaces/default/compare-experiments/s?experiments=["3","4","5","6"]&searchFilter=`,
      ]);
    });

    it('builds breadcrumbs for compare-experiments with single experiment', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/compare-experiments/s?experiments=["1"]',
      );
      expect(labels(result)).toEqual(['Experiments', 'Displaying Runs from 1 Experiment']);
    });
  });

  describe('compare-model-versions', () => {
    it('builds breadcrumbs for compare-model-versions page', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/compare-model-versions',
      );
      expect(labels(result)).toEqual(['Models', 'Compare Model Versions']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/models`,
        `${ROUTE_PREFIX}/workspaces/default/compare-model-versions`,
      ]);
    });
  });

  describe('metric', () => {
    it('builds breadcrumbs for metric page with metric name', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/workspaces/default/metric/accuracy');
      expect(labels(result)).toEqual(['Experiments', 'accuracy']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/experiments`,
        `${ROUTE_PREFIX}/workspaces/default/metric/accuracy`,
      ]);
    });

    it('builds breadcrumbs for metric page with nested path', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/metric/train/loss/epoch',
      );
      expect(labels(result)).toEqual(['Experiments', 'train/loss/epoch']);
    });

    it('builds breadcrumbs for metric page without metric name', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/workspaces/default/metric');
      expect(labels(result)).toEqual(['Experiments', 'Metric']);
    });
  });

  describe('standalone prompts', () => {
    it('builds breadcrumbs for /prompts/:promptName', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/workspaces/default/prompts/myPrompt');
      expect(labels(result)).toEqual(['Prompts', 'myPrompt']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/prompts`,
        `${ROUTE_PREFIX}/workspaces/default/prompts/myPrompt`,
      ]);
    });
  });

  describe('standalone models', () => {
    it('builds breadcrumbs for /models/:modelName', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/workspaces/default/models/myModel');
      expect(labels(result)).toEqual(['Models', 'myModel']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/models`,
        `${ROUTE_PREFIX}/workspaces/default/models/myModel`,
      ]);
    });

    it('builds breadcrumbs for /models/:modelName/versions/:version', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/models/myModel/versions/7',
      );
      expect(labels(result)).toEqual(['Models', 'myModel', 'Version 7']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/models`,
        `${ROUTE_PREFIX}/workspaces/default/models/myModel`,
        `${ROUTE_PREFIX}/workspaces/default/models/myModel/versions/7`,
      ]);
    });

    it('builds breadcrumbs for /models/:modelName/:subpage', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/models/myModel/aliases',
      );
      expect(labels(result)).toEqual(['Models', 'myModel', 'aliases']);
    });

    it('builds breadcrumbs for /models/:modelName/:subpage/:name', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/models/myModel/aliases/production',
      );
      expect(labels(result)).toEqual(['Models', 'myModel', 'aliases', 'production']);
    });
  });

  describe('standalone runs (direct access)', () => {
    it('builds breadcrumbs for /runs/:runUuid', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/workspaces/default/runs/abcd-1234');
      expect(labels(result)).toEqual(['Experiments', 'abcd-1234']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/experiments`,
        `${ROUTE_PREFIX}/workspaces/default/runs/abcd-1234`,
      ]);
    });
  });

  describe('experiment + tab combined label', () => {
    it('builds combined label for experiments/:id/runs', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/runs',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/experiments`,
        `${ROUTE_PREFIX}/workspaces/default/experiments/123/runs`,
      ]);
    });

    it('builds combined label for experiments/:id/traces', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/456/traces',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 456 traces']);
    });

    it('builds combined label for experiments/:id/models', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/789/models',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 789 models']);
    });

    it('builds combined label for experiments/:id/prompts', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/prompts',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 prompts']);
    });

    it('builds combined label for experiments/:id/chat-sessions', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/chat-sessions',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 chat sessions']);
    });

    it('builds combined label for experiments/:id/datasets', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/datasets',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 datasets']);
    });

    it('builds combined label for experiments/:id/evaluation-runs', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/evaluation-runs',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 evaluation runs']);
    });
  });

  describe('run details', () => {
    it('builds breadcrumbs for experiments/:id/runs/:runUuid', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/runs/abcd-5678',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs', 'abcd-5678']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/experiments`,
        `${ROUTE_PREFIX}/workspaces/default/experiments/123/runs`,
        `${ROUTE_PREFIX}/workspaces/default/experiments/123/runs/abcd-5678`,
      ]);
    });
  });

  describe('run artifacts special case', () => {
    it('builds breadcrumbs for experiments/:id/runs/:runUuid/artifactPath', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/runs/abcd/artifactPath',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs', 'abcd', 'Artifacts']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/experiments`,
        `${ROUTE_PREFIX}/workspaces/default/experiments/123/runs`,
        `${ROUTE_PREFIX}/workspaces/default/experiments/123/runs/abcd`,
        `${ROUTE_PREFIX}/workspaces/default/experiments/123/runs/abcd/artifactPath`,
      ]);
    });

    it('consumes extra segment after artifactPath without adding extra crumbs', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/runs/abcd/artifactPath/some-file.txt',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs', 'abcd', 'Artifacts']);
    });
  });

  describe('model details + tab under experiments', () => {
    it('builds breadcrumbs for experiments/:id/models/:loggedModelId', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/models/lm-1',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 models', 'lm-1']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/experiments`,
        `${ROUTE_PREFIX}/workspaces/default/experiments/123/models`,
        `${ROUTE_PREFIX}/workspaces/default/experiments/123/models/lm-1`,
      ]);
    });

    it('builds breadcrumbs for experiments/:id/models/:loggedModelId/:tabName', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/models/lm-1/details',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 models', 'lm-1', 'details']);
    });
  });

  describe('chat-sessions and prompts nested under experiments', () => {
    it('builds breadcrumbs for experiments/:id/chat-sessions/:sessionId', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/chat-sessions/session1',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 chat sessions', 'session1']);
    });

    it('builds breadcrumbs for experiments/:id/prompts/:promptName', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/prompts/promptA',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 prompts', 'promptA']);
    });
  });

  describe('experiment without known tab', () => {
    it('builds breadcrumbs for just experiment id', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/workspaces/default/experiments/123');
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123']);
      expect(paths(result)).toEqual([
        `${ROUTE_PREFIX}/workspaces/default/experiments`,
        `${ROUTE_PREFIX}/workspaces/default/experiments/123`,
      ]);
    });
  });

  describe('fallback behavior', () => {
    it('handles tab not after an experiment id', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/models/lm-1',
      );
      expect(labels(result).length).toBeGreaterThan(0);
      expect(labels(result)[0]).toBe('Experiments');
    });

    it('handles unknown segments as generic crumbs', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/123/weirdPage',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123', 'weirdPage']);
    });

    it('handles runs not after experiment id', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/default/experiments/runs/abcd',
      );
      expect(labels(result).length).toBeGreaterThan(0);
      expect(labels(result)).toContain('Experiments');
    });
  });

  describe('edge cases', () => {
    it('handles path without workspace prefix', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery('/experiments/123/runs');
      expect(labels(result)).toEqual(['Experiments', 'Experiment 123 runs']);
    });

    it('handles different workspace names', () => {
      const result = buildBreadcrumbsFromMlflowPathQuery(
        '/workspaces/my-workspace/experiments/456/runs',
      );
      expect(labels(result)).toEqual(['Experiments', 'Experiment 456 runs']);
      expect(paths(result)[0]).toBe(`${ROUTE_PREFIX}/workspaces/my-workspace/experiments`);
    });
  });
});
