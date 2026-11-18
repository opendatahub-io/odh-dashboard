import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import { ServingRuntimeAPIProtocol } from '@odh-dashboard/model-serving/shared';
import {
  fireServingRuntimeTemplateCreated,
  fireServingRuntimeTemplateUpdated,
  fireServingRuntimeTemplateDeleted,
  fireServingRuntimeTemplateEnablementChanged,
} from '../servingRuntimeTemplateTracking';

const trackEvent = jest.fn();

describe('fireServingRuntimeTemplateCreated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Created event with mode and categorical properties on success', () => {
    fireServingRuntimeTemplateCreated(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
      apiProtocol: ServingRuntimeAPIProtocol.REST,
      modelTypes: 'predictive,generative',
    });

    expect(trackEvent).toHaveBeenCalledWith('Model Serving Serving Runtime Template Created', {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
      apiProtocol: ServingRuntimeAPIProtocol.REST,
      modelTypes: 'predictive,generative',
    });
  });

  it('should attribute install submit and cancel to the install source without user content', () => {
    fireServingRuntimeTemplateCreated(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'install',
      apiProtocol: ServingRuntimeAPIProtocol.REST,
      modelTypes: 'generative',
    });
    fireServingRuntimeTemplateCreated(trackEvent, {
      outcome: TrackingOutcome.cancel,
      mode: 'install',
    });
    expect(trackEvent).toHaveBeenNthCalledWith(
      1,
      'Model Serving Serving Runtime Template Created',
      {
        outcome: TrackingOutcome.submit,
        success: true,
        mode: 'create',
        source: 'install',
        apiProtocol: ServingRuntimeAPIProtocol.REST,
        modelTypes: 'generative',
      },
    );
    expect(trackEvent).toHaveBeenNthCalledWith(
      2,
      'Model Serving Serving Runtime Template Created',
      { outcome: TrackingOutcome.cancel, mode: 'create', source: 'install' },
    );
  });

  it('should normalize Add form mode to the existing create analytics value', () => {
    fireServingRuntimeTemplateCreated(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'add',
    });
    expect(trackEvent).toHaveBeenCalledWith('Model Serving Serving Runtime Template Created', {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
    });
  });

  it('should retain install attribution when submission fails', () => {
    fireServingRuntimeTemplateCreated(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: false,
      mode: 'install',
    });
    expect(trackEvent).toHaveBeenCalledWith('Model Serving Serving Runtime Template Created', {
      outcome: TrackingOutcome.submit,
      success: false,
      mode: 'create',
      source: 'install',
    });
  });

  it('should fire the Created event with mode duplicate', () => {
    fireServingRuntimeTemplateCreated(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'duplicate',
      apiProtocol: ServingRuntimeAPIProtocol.GRPC,
      modelTypes: 'predictive',
    });

    expect(trackEvent).toHaveBeenCalledWith(
      'Model Serving Serving Runtime Template Created',
      expect.objectContaining({ mode: 'duplicate', apiProtocol: ServingRuntimeAPIProtocol.GRPC }),
    );
  });

  it('should fire the Created event with success false on failure (no free-form error/PII)', () => {
    fireServingRuntimeTemplateCreated(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: false,
      mode: 'create',
    });

    expect(trackEvent).toHaveBeenCalledWith('Model Serving Serving Runtime Template Created', {
      outcome: TrackingOutcome.submit,
      success: false,
      mode: 'create',
    });
  });

  it('should fire the Created event with cancel outcome', () => {
    fireServingRuntimeTemplateCreated(trackEvent, {
      outcome: TrackingOutcome.cancel,
      mode: 'create',
    });

    expect(trackEvent).toHaveBeenCalledWith('Model Serving Serving Runtime Template Created', {
      outcome: TrackingOutcome.cancel,
      mode: 'create',
    });
  });
});

describe('fireServingRuntimeTemplateUpdated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Updated event on success', () => {
    fireServingRuntimeTemplateUpdated(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      apiProtocol: ServingRuntimeAPIProtocol.GRPC,
      modelTypes: 'generative',
    });

    expect(trackEvent).toHaveBeenCalledWith(
      'Model Serving Serving Runtime Template Updated',
      expect.objectContaining({
        success: true,
        apiProtocol: ServingRuntimeAPIProtocol.GRPC,
        modelTypes: 'generative',
      }),
    );
  });

  it('should fire the Updated event with cancel outcome', () => {
    fireServingRuntimeTemplateUpdated(trackEvent, { outcome: TrackingOutcome.cancel });

    expect(trackEvent).toHaveBeenCalledWith('Model Serving Serving Runtime Template Updated', {
      outcome: TrackingOutcome.cancel,
    });
  });
});

describe('fireServingRuntimeTemplateDeleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Deleted event on success', () => {
    fireServingRuntimeTemplateDeleted(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(trackEvent).toHaveBeenCalledWith('Model Serving Serving Runtime Template Deleted', {
      outcome: TrackingOutcome.submit,
      success: true,
    });
  });

  it('should fire the Deleted event with cancel outcome when the dialog is dismissed', () => {
    fireServingRuntimeTemplateDeleted(trackEvent, { outcome: TrackingOutcome.cancel });

    expect(trackEvent).toHaveBeenCalledWith('Model Serving Serving Runtime Template Deleted', {
      outcome: TrackingOutcome.cancel,
    });
  });
});

describe('fireServingRuntimeTemplateEnablementChanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Enablement Changed event with the new enabled state', () => {
    fireServingRuntimeTemplateEnablementChanged(trackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      enabled: false,
    });

    expect(trackEvent).toHaveBeenCalledWith(
      'Model Serving Serving Runtime Template Enablement Changed',
      { outcome: TrackingOutcome.submit, success: true, enabled: false },
    );
  });
});

describe('failure forwarding', () => {
  it.each([
    [
      'updated',
      fireServingRuntimeTemplateUpdated,
      'Model Serving Serving Runtime Template Updated',
    ],
    [
      'deleted',
      fireServingRuntimeTemplateDeleted,
      'Model Serving Serving Runtime Template Deleted',
    ],
  ])(
    'should emit exactly one %s failure without adding properties',
    (_name, fireEvent, eventName) => {
      const injectedTracking = jest.fn();
      fireEvent(injectedTracking, { outcome: TrackingOutcome.submit, success: false });
      expect(injectedTracking.mock.calls).toEqual([
        [eventName, { outcome: 'submit', success: false }],
      ]);
    },
  );

  it('should forward the reverted enablement state on failure', () => {
    const injectedTracking = jest.fn();
    fireServingRuntimeTemplateEnablementChanged(injectedTracking, {
      outcome: TrackingOutcome.submit,
      success: false,
      enabled: true,
    });
    expect(injectedTracking.mock.calls).toEqual([
      [
        'Model Serving Serving Runtime Template Enablement Changed',
        { outcome: 'submit', success: false, enabled: true },
      ],
    ]);
  });
});
