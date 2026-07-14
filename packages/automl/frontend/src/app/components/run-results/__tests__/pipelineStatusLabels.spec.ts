import { getPipelineStatusFilterLabel } from '~/app/components/run-results/pipelineStatusLabels';

describe('getPipelineStatusFilterLabel', () => {
  it('should show a canceled label distinct from failed', () => {
    expect(getPipelineStatusFilterLabel('canceled')).toEqual({
      text: 'Canceled',
      status: 'warning',
    });
  });

  it('should show a failed label', () => {
    expect(getPipelineStatusFilterLabel('error')).toEqual({
      text: 'Failed',
      status: 'danger',
    });
  });
});
