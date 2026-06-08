import { mlflowCompareRunsRoute } from '#~/routes/pipelines/mlflow';

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
