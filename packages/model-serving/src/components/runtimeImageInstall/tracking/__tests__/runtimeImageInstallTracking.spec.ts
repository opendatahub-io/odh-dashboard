import { TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  RuntimeImageInstallTrackingEvent,
  fireCreateStarted,
  fireConfigurationSelected,
  fireCreateCompleted,
  toConfigurationType,
} from '../runtimeImageInstallTracking';

const mockTrackEvent = jest.fn();

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

  it('should call trackEvent with runtime properties', () => {
    fireCreateStarted(mockTrackEvent, {
      runtimeName: 'vLLM',
      version: '0.6.0',
      hardware: 'NVIDIA GPU',
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(RuntimeImageInstallTrackingEvent.CREATE_STARTED, {
      runtimeName: 'vLLM',
      version: '0.6.0',
      hardware: 'NVIDIA GPU',
    });
  });
});

describe('fireConfigurationSelected', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call trackEvent for serving runtime template selection', () => {
    fireConfigurationSelected(mockTrackEvent, {
      configurationType: 'serving-runtime-template',
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      RuntimeImageInstallTrackingEvent.CONFIGURATION_SELECTED,
      { configurationType: 'serving-runtime-template' },
    );
  });

  it('should call trackEvent for llm accelerator configuration selection', () => {
    fireConfigurationSelected(mockTrackEvent, {
      configurationType: 'llm-accelerator-configuration',
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      RuntimeImageInstallTrackingEvent.CONFIGURATION_SELECTED,
      { configurationType: 'llm-accelerator-configuration' },
    );
  });
});

describe('fireCreateCompleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call trackEvent on successful submit', () => {
    fireCreateCompleted(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      configurationType: 'serving-runtime-template',
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(RuntimeImageInstallTrackingEvent.CREATE_COMPLETED, {
      outcome: TrackingOutcome.submit,
      success: true,
      configurationType: 'serving-runtime-template',
    });
  });

  it('should call trackEvent on cancel', () => {
    fireCreateCompleted(mockTrackEvent, {
      outcome: TrackingOutcome.cancel,
      configurationType: 'llm-accelerator-configuration',
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(RuntimeImageInstallTrackingEvent.CREATE_COMPLETED, {
      outcome: TrackingOutcome.cancel,
      configurationType: 'llm-accelerator-configuration',
    });
  });

  it('should call trackEvent on failed submit', () => {
    fireCreateCompleted(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: false,
      configurationType: 'serving-runtime-template',
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(RuntimeImageInstallTrackingEvent.CREATE_COMPLETED, {
      outcome: TrackingOutcome.submit,
      success: false,
      configurationType: 'serving-runtime-template',
    });
  });
});
