/**
 * @jest-environment node
 */
import { apiClient, expectSuccess } from '../helpers';

describe('Core BFF Config - OpenShift Platform', () => {
  it('should have OpenShift-default feature flags', async () => {
    const { response } = expectSuccess(await apiClient.get('/api/config'));
    const dc = (response.data as { spec: { dashboardConfig: Record<string, unknown> } }).spec
      .dashboardConfig;
    expect(dc.enablement).toBe(true);
    expect(dc.disableProjects).toBe(false);
    expect(dc.disableBYONImageStream).toBe(false);
    expect(dc.disableISVBadges).toBe(false);
    expect(dc.disableAppLauncher).toBe(false);
    expect(dc.disablePipelines).toBe(false);
  });
});
