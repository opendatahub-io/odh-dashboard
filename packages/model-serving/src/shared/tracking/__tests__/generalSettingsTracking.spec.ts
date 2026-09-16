import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { DeploymentStrategy } from '../../../components/settings/DeploymentStrategySettings';
import {
  GeneralSettingsTrackingEvent,
  firePlatformSettingChanged,
  fireDeploymentStrategyChanged,
} from '../generalSettingsTracking';

const mockTrackEvent = jest.fn();

describe('firePlatformSettingChanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Platform Setting Changed event with the setting key and new value', () => {
    firePlatformSettingChanged(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      setting: 'llmd_enabled',
      enabled: true,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      GeneralSettingsTrackingEvent.PLATFORM_SETTING_CHANGED,
      {
        outcome: TrackingOutcome.submit,
        success: true,
        setting: 'llmd_enabled',
        enabled: true,
      },
    );
  });

  it('should support the model_serving_enabled setting toggled off', () => {
    firePlatformSettingChanged(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      setting: 'model_serving_enabled',
      enabled: false,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      GeneralSettingsTrackingEvent.PLATFORM_SETTING_CHANGED,
      expect.objectContaining({ setting: 'model_serving_enabled', enabled: false }),
    );
  });

  it('should support the llmd_default_for_generative setting', () => {
    firePlatformSettingChanged(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      setting: 'llmd_default_for_generative',
      enabled: true,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      GeneralSettingsTrackingEvent.PLATFORM_SETTING_CHANGED,
      expect.objectContaining({ setting: 'llmd_default_for_generative' }),
    );
  });
});

describe('fireDeploymentStrategyChanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Deployment Strategy Changed event with the strategy', () => {
    fireDeploymentStrategyChanged(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      strategy: DeploymentStrategy.ROLLING,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      GeneralSettingsTrackingEvent.DEPLOYMENT_STRATEGY_CHANGED,
      { outcome: TrackingOutcome.submit, success: true, strategy: DeploymentStrategy.ROLLING },
    );
  });

  it('should support the recreate strategy', () => {
    fireDeploymentStrategyChanged(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      strategy: DeploymentStrategy.RECREATE,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      GeneralSettingsTrackingEvent.DEPLOYMENT_STRATEGY_CHANGED,
      expect.objectContaining({ strategy: DeploymentStrategy.RECREATE }),
    );
  });
});
