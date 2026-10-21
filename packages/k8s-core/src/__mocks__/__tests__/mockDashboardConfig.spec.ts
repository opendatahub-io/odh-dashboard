import { mockDashboardConfig } from '../mockDashboardConfig';

describe('mockDashboardConfig grid flag', () => {
  it('should default grid to false', () => {
    expect(mockDashboardConfig({}).spec.dashboardConfig.grid).toBe(false);
  });

  it.each([true, false])('should preserve an explicit grid=%s override', (grid) => {
    expect(mockDashboardConfig({ grid }).spec.dashboardConfig.grid).toBe(grid);
  });
});
