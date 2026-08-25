import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { DeploymentStrategy } from '../../../components/settings/DeploymentStrategySettings';
import {
  GeneralSettingsTrackingEvent,
  firePlatformSettingChanged,
  fireDeploymentStrategyChanged,
} from '../generalSettingsTracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);

describe('firePlatformSettingChanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Platform Setting Changed event with the setting key and new value', () => {
    firePlatformSettingChanged({
      outcome: TrackingOutcome.submit,
      success: true,
      setting: 'llmd_enabled',
      enabled: true,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
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
    firePlatformSettingChanged({
      outcome: TrackingOutcome.submit,
      success: true,
      setting: 'model_serving_enabled',
      enabled: false,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      GeneralSettingsTrackingEvent.PLATFORM_SETTING_CHANGED,
      expect.objectContaining({ setting: 'model_serving_enabled', enabled: false }),
    );
  });

  it('should support the llmd_default_for_generative setting', () => {
    firePlatformSettingChanged({
      outcome: TrackingOutcome.submit,
      success: true,
      setting: 'llmd_default_for_generative',
      enabled: true,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
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
    fireDeploymentStrategyChanged({
      outcome: TrackingOutcome.submit,
      success: true,
      strategy: DeploymentStrategy.ROLLING,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      GeneralSettingsTrackingEvent.DEPLOYMENT_STRATEGY_CHANGED,
      { outcome: TrackingOutcome.submit, success: true, strategy: DeploymentStrategy.ROLLING },
    );
  });

  it('should support the recreate strategy', () => {
    fireDeploymentStrategyChanged({
      outcome: TrackingOutcome.submit,
      success: true,
      strategy: DeploymentStrategy.RECREATE,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      GeneralSettingsTrackingEvent.DEPLOYMENT_STRATEGY_CHANGED,
      expect.objectContaining({ strategy: DeploymentStrategy.RECREATE }),
    );
  });
});
