import { DEPLOY_BUTTON_TOOLTIP } from '@odh-dashboard/model-serving/shared';
import { getDeployButtonState } from '../getDeployButtonState';

describe('getDeployButtonState', () => {
  it('should return disabled when no platforms are available', () => {
    expect(getDeployButtonState([])).toEqual({
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_MODEL_SERVING_PLATFORM,
    });
  });

  it('should return disabled when KServe is required but not available', () => {
    expect(getDeployButtonState(['nim'], true)).toEqual({
      enabled: false,
      tooltip: DEPLOY_BUTTON_TOOLTIP.ENABLE_SINGLE_MODEL_SERVING,
    });
  });

  it('should return enabled when platforms are available', () => {
    expect(getDeployButtonState(['kserve'])).toEqual({ enabled: true });
  });

  it('should return enabled when KServe is required and present', () => {
    expect(getDeployButtonState(['kserve', 'nim'], true)).toEqual({ enabled: true });
  });

  it('should return enabled when KServe is not required and other platforms exist', () => {
    expect(getDeployButtonState(['nim'])).toEqual({ enabled: true });
  });
});
