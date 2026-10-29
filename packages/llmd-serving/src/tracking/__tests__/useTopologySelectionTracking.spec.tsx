import React from 'react';
import { act } from '@testing-library/react';
import { renderHook } from '@odh-dashboard/jest-config/hooks';
import { mockLLMInferenceServiceConfigK8sResource } from '../../__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { TopologyType } from '../../types';
import { TOPOLOGY_CONFIG_DEFAULT } from '../../const';
import { fireTopologyTypeSelected } from '../llmdTrackingConstants';
import { useTopologySelectionTracking } from '../useTopologySelectionTracking';

jest.mock('../llmdTrackingConstants', () => ({ fireTopologyTypeSelected: jest.fn() }));
const mockTrack = jest.mocked(fireTopologyTypeSelected);
type Options = Parameters<typeof useTopologySelectionTracking>[0];

const firstConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'first-config',
  topologyType: TopologyType.MULTI_NODE,
});
const secondConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'second-config',
  topologyType: TopologyType.MULTI_NODE,
});
const externalData = {
  loaded: true,
  data: {
    configsByTopology: {
      [TopologyType.SINGLE_NODE]: [],
      [TopologyType.MULTI_NODE]: [firstConfig, secondConfig],
      [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
      [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
    },
  },
};
const initialOptions: Options = {
  topologyType: TopologyType.SINGLE_NODE,
  configurationData: { selectedConfig: TOPOLOGY_CONFIG_DEFAULT },
  externalData,
};
const renderTracking = () =>
  renderHook(useTopologySelectionTracking, {
    initialProps: initialOptions,
    wrapper: React.StrictMode,
  });

describe('useTopologySelectionTracking', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should ignore hydration, configuration-only changes and selecting the same topology', () => {
    const hook = renderTracking();
    act(() => hook.result.current(TopologyType.SINGLE_NODE));
    hook.rerender({
      ...initialOptions,
      topologyType: TopologyType.MULTI_NODE,
      configurationData: { selectedConfig: secondConfig },
    });
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('should wait for resolution and emit once for any compatible selection', () => {
    const hook = renderTracking();
    act(() => hook.result.current(TopologyType.MULTI_NODE));
    expect(mockTrack).not.toHaveBeenCalled();
    const options: Options = { ...initialOptions, topologyType: TopologyType.MULTI_NODE };
    hook.rerender(options); // Stale single-node default.
    hook.rerender({ ...options, configurationData: { configRef: 'second-config' } });
    hook.rerender({
      ...options,
      configurationData: { selectedConfig: secondConfig },
      externalData: { ...externalData, loaded: false },
    });
    hook.rerender({
      ...options,
      configurationData: { selectedConfig: secondConfig },
      externalData: { ...externalData, loadError: new Error('failed') },
    });
    expect(mockTrack).not.toHaveBeenCalled();
    hook.rerender({ ...options, configurationData: { selectedConfig: secondConfig } });
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith({
      llmdComposablePattern: TopologyType.MULTI_NODE,
      previousPattern: TopologyType.SINGLE_NODE,
      topologyConfigurationId: 'second-config',
    });
    hook.rerender({ ...options, configurationData: { selectedConfig: firstConfig } });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('should replace pending changes and ignore late configuration resolution', () => {
    const hook = renderTracking();
    act(() => hook.result.current(TopologyType.MULTI_NODE));
    hook.rerender({
      ...initialOptions,
      topologyType: TopologyType.MULTI_NODE,
      configurationData: undefined,
    });
    act(() => hook.result.current(TopologyType.SINGLE_NODE));
    hook.rerender({ ...initialOptions, configurationData: { selectedConfig: secondConfig } });
    expect(mockTrack).not.toHaveBeenCalled();
    hook.rerender(initialOptions);
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith({
      llmdComposablePattern: TopologyType.SINGLE_NODE,
      previousPattern: TopologyType.MULTI_NODE,
      topologyConfigurationId: TOPOLOGY_CONFIG_DEFAULT,
    });
    hook.rerender(initialOptions);
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, null, {}, { selectedConfig: { metadata: { name: 5 } } }])(
    'should wait for malformed or missing configuration data %p',
    (configurationData) => {
      const hook = renderTracking();
      act(() => hook.result.current(TopologyType.MULTI_NODE));
      hook.rerender({
        ...initialOptions,
        topologyType: TopologyType.MULTI_NODE,
        configurationData,
      });
      expect(mockTrack).not.toHaveBeenCalled();
    },
  );

  it('should discard pending tracking on unmount', () => {
    const hook = renderTracking();
    act(() => hook.result.current(TopologyType.MULTI_NODE));
    hook.unmount();
    const next = renderTracking();
    next.rerender({
      ...initialOptions,
      topologyType: TopologyType.MULTI_NODE,
      configurationData: { selectedConfig: secondConfig },
    });
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
