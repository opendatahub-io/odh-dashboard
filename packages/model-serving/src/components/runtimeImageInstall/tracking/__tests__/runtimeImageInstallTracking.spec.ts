import {
  fireMiscTrackingEvent,
  fireFormTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  RuntimeImageInstallTrackingEvent,
  fireCreateStarted,
  fireConfigurationSelected,
  fireCreateCompleted,
  toConfigurationType,
} from '../runtimeImageInstallTracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
  fireFormTrackingEvent: jest.fn(),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);
const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);

describe('RuntimeImageInstallTrackingEvent', () => {
  it('should have correct event names', () => {
    expect(RuntimeImageInstallTrackingEvent.CREATE_STARTED).toBe(
      'Runtime Image Library Create Started',
    );
    expect(RuntimeImageInstallTrackingEvent.CONFIGURATION_SELECTED).toBe(
      'Runtime Image Library Configuration Selected',
    );
    expect(RuntimeImageInstallTrackingEvent.CREATE_COMPLETED).toBe(
      'Runtime Image Library Create Completed',
    );
  });
});

describe('toConfigurationType', () => {
  it('should map servingRuntimeTemplate to serving-runtime-template', () => {
    expect(toConfigurationType('servingRuntimeTemplate')).toBe('serving-runtime-template');
  });

  it('should map llmInferenceServiceConfig to llm-accelerator-configuration', () => {
    expect(toConfigurationType('llmInferenceServiceConfig')).toBe('llm-accelerator-configuration');
  });
});

describe('fireCreateStarted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire miscellaneous tracking event with runtime properties', () => {
    fireCreateStarted({
      runtimeName: 'vLLM',
      version: '0.6.0',
      hardware: 'NVIDIA GPU',
    });

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      RuntimeImageInstallTrackingEvent.CREATE_STARTED,
      {
        runtimeName: 'vLLM',
        version: '0.6.0',
        hardware: 'NVIDIA GPU',
      },
    );
  });
});

describe('fireConfigurationSelected', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire miscellaneous tracking event for serving runtime template selection', () => {
    fireConfigurationSelected({ configurationType: 'serving-runtime-template' });

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      RuntimeImageInstallTrackingEvent.CONFIGURATION_SELECTED,
      { configurationType: 'serving-runtime-template' },
    );
  });

  it('should fire miscellaneous tracking event for llm accelerator configuration selection', () => {
    fireConfigurationSelected({ configurationType: 'llm-accelerator-configuration' });

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      RuntimeImageInstallTrackingEvent.CONFIGURATION_SELECTED,
      { configurationType: 'llm-accelerator-configuration' },
    );
  });
});

describe('fireCreateCompleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire form tracking event on successful submit', () => {
    fireCreateCompleted({
      outcome: TrackingOutcome.submit,
      success: true,
      configurationType: 'serving-runtime-template',
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      RuntimeImageInstallTrackingEvent.CREATE_COMPLETED,
      {
        outcome: TrackingOutcome.submit,
        success: true,
        configurationType: 'serving-runtime-template',
      },
    );
  });

  it('should fire form tracking event on cancel', () => {
    fireCreateCompleted({
      outcome: TrackingOutcome.cancel,
      configurationType: 'llm-accelerator-configuration',
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      RuntimeImageInstallTrackingEvent.CREATE_COMPLETED,
      {
        outcome: TrackingOutcome.cancel,
        configurationType: 'llm-accelerator-configuration',
      },
    );
  });

  it('should fire form tracking event on failed submit', () => {
    fireCreateCompleted({
      outcome: TrackingOutcome.submit,
      success: false,
      configurationType: 'serving-runtime-template',
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      RuntimeImageInstallTrackingEvent.CREATE_COMPLETED,
      {
        outcome: TrackingOutcome.submit,
        success: false,
        configurationType: 'serving-runtime-template',
      },
    );
  });
});
