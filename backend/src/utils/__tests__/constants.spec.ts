import { blankDashboardCR } from '../constants';

describe('blankDashboardCR', () => {
  it('enables AutoML by default', () => {
    expect(blankDashboardCR.spec.dashboardConfig.automl).toBe(true);
  });
});
