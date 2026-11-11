import { TrackingOutcome } from '@odh-dashboard/analytics/types';
import { TopologyType } from '../../types';
import {
  LlmInferenceServiceConfigTrackingEvent,
  TopologyConfigTrackingEvent,
  RoutingConfigTrackingEvent,
  fireLlmInferenceServiceConfigCreated,
  fireLlmInferenceServiceConfigUpdated,
  fireLlmInferenceServiceConfigDeleted,
  fireLlmInferenceServiceConfigEnablementChanged,
  fireTopologyConfigCreated,
  fireTopologyConfigUpdated,
  fireTopologyConfigDeleted,
  fireRoutingConfigCreated,
  fireRoutingConfigUpdated,
  fireRoutingConfigDeleted,
} from '../llmdTrackingConstants';

const mockTrackEvent = jest.fn();

describe('LLM inference service config tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fire the Created event with mode through the supplied tracking callback', () => {
    fireLlmInferenceServiceConfigCreated(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(LlmInferenceServiceConfigTrackingEvent.CREATED, {
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
    fireLlmInferenceServiceConfigCreated(mockTrackEvent, { ...properties, mode: 'install' });
    expect(mockTrackEvent).toHaveBeenCalledWith(LlmInferenceServiceConfigTrackingEvent.CREATED, {
      ...properties,
      mode: 'create',
      source: 'install',
    });
  });

  it('should normalize Add form mode to the existing create analytics value', () => {
    fireLlmInferenceServiceConfigCreated(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'add',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(LlmInferenceServiceConfigTrackingEvent.CREATED, {
      outcome: TrackingOutcome.submit,
      success: true,
      mode: 'create',
    });
  });

  it('should fire the Created event with cancel outcome', () => {
    fireLlmInferenceServiceConfigCreated(mockTrackEvent, {
      outcome: TrackingOutcome.cancel,
      mode: 'duplicate',
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(LlmInferenceServiceConfigTrackingEvent.CREATED, {
      outcome: TrackingOutcome.cancel,
      mode: 'duplicate',
    });
  });

  it('should fire the Updated event', () => {
    fireLlmInferenceServiceConfigUpdated(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(LlmInferenceServiceConfigTrackingEvent.UPDATED, {
      outcome: TrackingOutcome.submit,
      success: true,
    });
  });

  it('should fire the Deleted event on submit and on cancel', () => {
    fireLlmInferenceServiceConfigDeleted(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
    });
    fireLlmInferenceServiceConfigDeleted(mockTrackEvent, { outcome: TrackingOutcome.cancel });

    expect(mockTrackEvent).toHaveBeenNthCalledWith(
      1,
      LlmInferenceServiceConfigTrackingEvent.DELETED,
      {
        outcome: TrackingOutcome.submit,
        success: true,
      },
    );
    expect(mockTrackEvent).toHaveBeenNthCalledWith(
      2,
      LlmInferenceServiceConfigTrackingEvent.DELETED,
      {
        outcome: TrackingOutcome.cancel,
      },
    );
  });

  it('should fire the Enablement Changed event with the new enabled state', () => {
    fireLlmInferenceServiceConfigEnablementChanged(mockTrackEvent, {
      outcome: TrackingOutcome.submit,
      success: true,
      enabled: true,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      LlmInferenceServiceConfigTrackingEvent.ENABLEMENT_CHANGED,
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
