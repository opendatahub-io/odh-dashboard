import {
  mlflowCompareRunsRoute,
  mlflowExperimentRoute,
  mlflowRunRoute,
} from '#~/routes/pipelines/mlflow';

describe('mlflowExperimentRoute', () => {
  it('builds an experiment runs URL with workspace and empty searchFilter', () => {
    expect(mlflowExperimentRoute('exp-42', 'nana-pipelines-2')).toBe(
      '/develop-train/mlflow/experiments/exp-42/runs?workspace=nana-pipelines-2&searchFilter=',
    );
  });

  it('includes empty searchFilter when namespace is omitted', () => {
    expect(mlflowExperimentRoute('exp-42')).toBe(
      '/develop-train/mlflow/experiments/exp-42/runs?searchFilter=',
    );
  });

  it('encodes the experiment id in the path', () => {
    expect(mlflowExperimentRoute('exp/with spaces', 'ns')).toBe(
      `/develop-train/mlflow/experiments/${encodeURIComponent(
        'exp/with spaces',
      )}/runs?workspace=ns&searchFilter=`,
    );
  });
});

describe('mlflowRunRoute', () => {
  it('builds a run URL with workspace', () => {
    expect(mlflowRunRoute('exp-1', 'run-abc', 'my-ns')).toBe(
      '/develop-train/mlflow/experiments/exp-1/runs/run-abc?workspace=my-ns',
    );
  });

  it('builds a run URL without workspace', () => {
    expect(mlflowRunRoute('exp-1', 'run-abc')).toBe(
      '/develop-train/mlflow/experiments/exp-1/runs/run-abc',
    );
  });

  it('encodes the experiment id and run id in the path', () => {
    expect(mlflowRunRoute('exp/with spaces', 'run/special', 'ns')).toBe(
      `/develop-train/mlflow/experiments/${encodeURIComponent(
        'exp/with spaces',
      )}/runs/${encodeURIComponent('run/special')}?workspace=ns`,
    );
  });
});

describe('mlflowCompareRunsRoute', () => {
  it('builds a compare URL with runs, experiments, and workspace', () => {
    const params = new URLSearchParams();
    params.set('runs', JSON.stringify(['r1', 'r2']));
    params.set('experiments', JSON.stringify(['e1']));
    params.set('workspace', 'my-ns');
    expect(mlflowCompareRunsRoute('my-ns', ['r1', 'r2'], ['e1'])).toBe(
      `/develop-train/mlflow/experiments/compare-runs?${params.toString()}`,
    );
  });

  it('omits runs param when array is empty', () => {
    const url = mlflowCompareRunsRoute('ns', [], ['e1']);
    expect(url).not.toContain('runs=');
    expect(url).toContain('experiments=');
  });

  it('omits experiments param when array is empty', () => {
    const url = mlflowCompareRunsRoute('ns', ['r1'], []);
    expect(url).toContain('runs=');
    expect(url).not.toContain('experiments=');
  });

  it('encodes experiment IDs in the URL', () => {
    const url = mlflowCompareRunsRoute('ns', ['r1', 'r2'], ['e1']);
    expect(url).toContain(`experiments=${encodeURIComponent(JSON.stringify(['e1']))}`);
  });
});
