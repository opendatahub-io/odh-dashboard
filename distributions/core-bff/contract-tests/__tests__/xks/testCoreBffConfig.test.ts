/**
 * @jest-environment node
 */
import { apiClient, expectSuccess } from '../helpers';

describe('Core BFF Config - XKS Platform', () => {
  it('should have XKS feature overrides applied', async () => {
    const { response } = expectSuccess(await apiClient.get('/api/config'));
    const dc = (response.data as { spec: { dashboardConfig: Record<string, unknown> } }).spec
      .dashboardConfig;
    expect(dc.enablement).toBe(false);
    expect(dc.disableProjects).toBe(true);
    expect(dc.disableBYONImageStream).toBe(true);
    expect(dc.disableISVBadges).toBe(true);
    expect(dc.disableAppLauncher).toBe(true);
    expect(dc.disablePipelines).toBe(true);
    expect(dc.mlflow).toBe(false);
  });
});
