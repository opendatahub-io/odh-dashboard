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

const mockTrackEvent = jest.fn();

describe('LLM accelerator config tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Created event with mode through the supplied tracking callback', () => {
    fireLlmAcceleratorConfigCreated(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(LlmAcceleratorConfigTrackingEvent.CREATED, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
    });
  });

  it.each([
    { outcome: TrackingOutcome.submit, success: true },
    { outcome: TrackingOutcome.submit, success: false },
    { outcome: TrackingOutcome.cancel },
  ])('should retain install attribution for $outcome/$success', (properties) => {
    fireLlmAcceleratorConfigCreated(mockTrackEvent, { ...properties, mode: 'install' });
    expect(mockTrackEvent).toHaveBeenCalledWith(LlmAcceleratorConfigTrackingEvent.CREATED, {
      ...properties,
      mode: 'create',
      source: 'install',
    });
  });

  it('should normalize Add form mode to the existing create analytics value', () => {
    fireLlmAcceleratorConfigCreated(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'add',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(LlmAcceleratorConfigTrackingEvent.CREATED, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
    });
  });

  it('should fire the Created event with cancel outcome', () => {
    fireLlmAcceleratorConfigCreated(mockTrackEvent, {
      outcome: TrackingOutcome.cancel,
      mode: 'duplicate',
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(LlmAcceleratorConfigTrackingEvent.CREATED, {
      outcome: TrackingOutcome.cancel,
      mode: 'duplicate',
    });
  });

  it('should fire the Updated event', () => {
    fireLlmAcceleratorConfigUpdated(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(LlmAcceleratorConfigTrackingEvent.UPDATED, {
      outcome: TrackingOutcome.submit,
      success: true,
    });
  });

  it('should fire the Deleted event on submit and on cancel', () => {
    fireLlmAcceleratorConfigDeleted(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
    });
    fireLlmAcceleratorConfigDeleted(mockTrackEvent, { outcome: TrackingOutcome.cancel });

    expect(mockTrackEvent).toHaveBeenNthCalledWith(1, LlmAcceleratorConfigTrackingEvent.DELETED, {
      outcome: TrackingOutcome.submit,
      success: true,
    });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(2, LlmAcceleratorConfigTrackingEvent.DELETED, {
      outcome: TrackingOutcome.cancel,
    });
  });

  it('should fire the Enablement Changed event with the new enabled state', () => {
    fireLlmAcceleratorConfigEnablementChanged(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      enabled: true,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
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
    fireTopologyConfigCreated(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
      configSource: 'template',
      topologyType: TopologyType.MULTI_NODE,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(TopologyConfigTrackingEvent.CREATED, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
      configSource: 'template',
      topologyType: TopologyType.MULTI_NODE,
    });
  });

  it('should fire the Updated event with topologyType', () => {
    fireTopologyConfigUpdated(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      topologyType: TopologyType.SINGLE_NODE,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      TopologyConfigTrackingEvent.UPDATED,
      expect.objectContaining({ topologyType: TopologyType.SINGLE_NODE }),
    );
  });

  it('should fire the Deleted event on submit and on cancel', () => {
    fireTopologyConfigDeleted(mockTrackEvent, { outcome: TrackingOutcome.submit, success: true });
    fireTopologyConfigDeleted(mockTrackEvent, { outcome: TrackingOutcome.cancel });

    expect(mockTrackEvent).toHaveBeenNthCalledWith(1, TopologyConfigTrackingEvent.DELETED, {
      outcome: TrackingOutcome.submit,
      success: true,
    });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(2, TopologyConfigTrackingEvent.DELETED, {
      outcome: TrackingOutcome.cancel,
    });
  });
});

describe('llm-d routing config tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Created event with mode, configSource, and topologyType', () => {
    fireRoutingConfigCreated(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
      configSource: 'editor',
      topologyType: TopologyType.SINGLE_NODE_DISAGGREGATED,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(RoutingConfigTrackingEvent.CREATED, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
      configSource: 'editor',
      topologyType: TopologyType.SINGLE_NODE_DISAGGREGATED,
    });
  });

  it('should fire the Updated event with topologyType', () => {
    fireRoutingConfigUpdated(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      topologyType: TopologyType.MULTI_NODE_DISAGGREGATED,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      RoutingConfigTrackingEvent.UPDATED,
      expect.objectContaining({ topologyType: TopologyType.MULTI_NODE_DISAGGREGATED }),
    );
  });

  it('should fire the Deleted event on submit and on cancel', () => {
    fireRoutingConfigDeleted(mockTrackEvent, { outcome: TrackingOutcome.submit, success: true });
    fireRoutingConfigDeleted(mockTrackEvent, { outcome: TrackingOutcome.cancel });

    expect(mockTrackEvent).toHaveBeenNthCalledWith(1, RoutingConfigTrackingEvent.DELETED, {
      outcome: TrackingOutcome.submit,
      success: true,
    });
    expect(mockTrackEvent).toHaveBeenNthCalledWith(2, RoutingConfigTrackingEvent.DELETED, {
      outcome: TrackingOutcome.cancel,
    });
  });
});
