import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { ServingRuntimeAPIProtocol } from '@odh-dashboard/model-serving/shared';
import {
  ServingRuntimeTemplateTrackingEvent,
  fireServingRuntimeTemplateCreated,
  fireServingRuntimeTemplateUpdated,
  fireServingRuntimeTemplateDeleted,
  fireServingRuntimeTemplateEnablementChanged,
} from '../servingRuntimeTemplateTracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);

describe('fireServingRuntimeTemplateCreated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Created event with mode and categorical properties on success', () => {
    fireServingRuntimeTemplateCreated({
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
      apiProtocol: ServingRuntimeAPIProtocol.REST,
      modelTypes: 'predictive,generative',
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      ServingRuntimeTemplateTrackingEvent.CREATED,
      {
        outcome: TrackingOutcome.submit,
        success: true,
        mode: 'create',
        apiProtocol: ServingRuntimeAPIProtocol.REST,
        modelTypes: 'predictive,generative',
      },
    );
  });

  it('should fire the Created event with mode duplicate', () => {
    fireServingRuntimeTemplateCreated({
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'duplicate',
      apiProtocol: ServingRuntimeAPIProtocol.GRPC,
      modelTypes: 'predictive',
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      ServingRuntimeTemplateTrackingEvent.CREATED,
      expect.objectContaining({ mode: 'duplicate', apiProtocol: ServingRuntimeAPIProtocol.GRPC }),
    );
  });

  it('should fire the Created event with success false on failure (no free-form error/PII)', () => {
    fireServingRuntimeTemplateCreated({
      outcome: TrackingOutcome.submit,
      success: false,
      mode: 'create',
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      ServingRuntimeTemplateTrackingEvent.CREATED,
      { outcome: TrackingOutcome.submit, success: false, mode: 'create' },
    );
  });

  it('should fire the Created event with cancel outcome', () => {
    fireServingRuntimeTemplateCreated({ outcome: TrackingOutcome.cancel, mode: 'create' });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      ServingRuntimeTemplateTrackingEvent.CREATED,
      { outcome: TrackingOutcome.cancel, mode: 'create' },
    );
  });
});

describe('fireServingRuntimeTemplateUpdated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Updated event on success', () => {
    fireServingRuntimeTemplateUpdated({
      outcome: TrackingOutcome.submit,
      success: true,
      apiProtocol: ServingRuntimeAPIProtocol.GRPC,
      modelTypes: 'generative',
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      ServingRuntimeTemplateTrackingEvent.UPDATED,
      expect.objectContaining({
        success: true,
        apiProtocol: ServingRuntimeAPIProtocol.GRPC,
        modelTypes: 'generative',
      }),
    );
  });

  it('should fire the Updated event with cancel outcome', () => {
    fireServingRuntimeTemplateUpdated({ outcome: TrackingOutcome.cancel });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      ServingRuntimeTemplateTrackingEvent.UPDATED,
      { outcome: TrackingOutcome.cancel },
    );
  });
});

describe('fireServingRuntimeTemplateDeleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Deleted event on success', () => {
    fireServingRuntimeTemplateDeleted({ outcome: TrackingOutcome.submit, success: true });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      ServingRuntimeTemplateTrackingEvent.DELETED,
      { outcome: TrackingOutcome.submit, success: true },
    );
  });

  it('should fire the Deleted event with cancel outcome when the dialog is dismissed', () => {
    fireServingRuntimeTemplateDeleted({ outcome: TrackingOutcome.cancel });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      ServingRuntimeTemplateTrackingEvent.DELETED,
      { outcome: TrackingOutcome.cancel },
    );
  });
});

describe('fireServingRuntimeTemplateEnablementChanged', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Enablement Changed event with the new enabled state', () => {
    fireServingRuntimeTemplateEnablementChanged({
      outcome: TrackingOutcome.submit,
      success: true,
      enabled: false,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      ServingRuntimeTemplateTrackingEvent.ENABLEMENT_CHANGED,
      { outcome: TrackingOutcome.submit, success: true, enabled: false },
    );
  });
});
