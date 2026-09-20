import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { TopologyType } from '../../types';
import {
  LlmAcceleratorConfigTrackingEvent,
  TopologyConfigTrackingEvent,
  RoutingConfigTrackingEvent,
  fireLlmAcceleratorConfigCreated,
  fireLlmAcceleratorConfigUpdated,
  fireLlmAcceleratorConfigDeleted,
  fireLlmAcceleratorConfigEnablementChanged,
  fireTopologyConfigCreated,
  fireTopologyConfigUpdated,
  fireTopologyConfigDeleted,
  fireRoutingConfigCreated,
  fireRoutingConfigUpdated,
  fireRoutingConfigDeleted,
} from '../llmdTrackingConstants';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);
const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

describe('LLM accelerator config tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Created event with mode via fireFormTrackingEvent', () => {
    fireLlmAcceleratorConfigCreated({
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      LlmAcceleratorConfigTrackingEvent.CREATED,
      { outcome: TrackingOutcome.submit, success: true, mode: 'create' },
    );
    expect(mockFireMiscTrackingEvent).not.toHaveBeenCalled();
  });

  it('should fire the Created event with cancel outcome', () => {
    fireLlmAcceleratorConfigCreated({ outcome: TrackingOutcome.cancel, mode: 'duplicate' });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      LlmAcceleratorConfigTrackingEvent.CREATED,
      { outcome: TrackingOutcome.cancel, mode: 'duplicate' },
    );
  });

  it('should fire the Updated event', () => {
    fireLlmAcceleratorConfigUpdated({ outcome: TrackingOutcome.submit, success: true });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      LlmAcceleratorConfigTrackingEvent.UPDATED,
      { outcome: TrackingOutcome.submit, success: true },
    );
  });

  it('should fire the Deleted event on submit and on cancel', () => {
    fireLlmAcceleratorConfigDeleted({ outcome: TrackingOutcome.submit, success: true });
    fireLlmAcceleratorConfigDeleted({ outcome: TrackingOutcome.cancel });

    expect(mockFireFormTrackingEvent).toHaveBeenNthCalledWith(
      1,
      LlmAcceleratorConfigTrackingEvent.DELETED,
      { outcome: TrackingOutcome.submit, success: true },
    );
    expect(mockFireFormTrackingEvent).toHaveBeenNthCalledWith(
      2,
      LlmAcceleratorConfigTrackingEvent.DELETED,
      { outcome: TrackingOutcome.cancel },
    );
  });

  it('should fire the Enablement Changed event with the new enabled state', () => {
    fireLlmAcceleratorConfigEnablementChanged({
      outcome: TrackingOutcome.submit,
      success: true,
      enabled: true,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      LlmAcceleratorConfigTrackingEvent.ENABLEMENT_CHANGED,
      { outcome: TrackingOutcome.submit, success: true, enabled: true },
    );
  });
});

describe('llm-d topology config tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Created event with mode, configSource, and topologyType', () => {
    fireTopologyConfigCreated({
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
      configSource: 'template',
      topologyType: TopologyType.MULTI_NODE,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(TopologyConfigTrackingEvent.CREATED, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
      configSource: 'template',
      topologyType: TopologyType.MULTI_NODE,
    });
  });

  it('should fire the Updated event with topologyType', () => {
    fireTopologyConfigUpdated({
      outcome: TrackingOutcome.submit,
      success: true,
      topologyType: TopologyType.SINGLE_NODE,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      TopologyConfigTrackingEvent.UPDATED,
      expect.objectContaining({ topologyType: TopologyType.SINGLE_NODE }),
    );
  });

  it('should fire the Deleted event on submit and on cancel', () => {
    fireTopologyConfigDeleted({ outcome: TrackingOutcome.submit, success: true });
    fireTopologyConfigDeleted({ outcome: TrackingOutcome.cancel });

    expect(mockFireFormTrackingEvent).toHaveBeenNthCalledWith(
      1,
      TopologyConfigTrackingEvent.DELETED,
      { outcome: TrackingOutcome.submit, success: true },
    );
    expect(mockFireFormTrackingEvent).toHaveBeenNthCalledWith(
      2,
      TopologyConfigTrackingEvent.DELETED,
      {
        outcome: TrackingOutcome.cancel,
      },
    );
  });
});

describe('llm-d routing config tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Created event with mode, configSource, and topologyType', () => {
    fireRoutingConfigCreated({
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
      configSource: 'editor',
      topologyType: TopologyType.SINGLE_NODE_DISAGGREGATED,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(RoutingConfigTrackingEvent.CREATED, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
      configSource: 'editor',
      topologyType: TopologyType.SINGLE_NODE_DISAGGREGATED,
    });
  });

  it('should fire the Updated event with topologyType', () => {
    fireRoutingConfigUpdated({
      outcome: TrackingOutcome.submit,
      success: true,
      topologyType: TopologyType.MULTI_NODE_DISAGGREGATED,
    });

    expect(mockFireFormTrackingEvent).toHaveBeenCalledWith(
      RoutingConfigTrackingEvent.UPDATED,
      expect.objectContaining({ topologyType: TopologyType.MULTI_NODE_DISAGGREGATED }),
    );
  });

  it('should fire the Deleted event on submit and on cancel', () => {
    fireRoutingConfigDeleted({ outcome: TrackingOutcome.submit, success: true });
    fireRoutingConfigDeleted({ outcome: TrackingOutcome.cancel });

    expect(mockFireFormTrackingEvent).toHaveBeenNthCalledWith(
      1,
      RoutingConfigTrackingEvent.DELETED,
      {
        outcome: TrackingOutcome.submit,
        success: true,
      },
    );
    expect(mockFireFormTrackingEvent).toHaveBeenNthCalledWith(
      2,
      RoutingConfigTrackingEvent.DELETED,
      {
        outcome: TrackingOutcome.cancel,
      },
    );
  });
});
