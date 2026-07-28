import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { TopologyType } from '../../types';
import {
  CustomTopologyConfigFieldWizardField,
  TOPOLOGY_CONFIG_DEFAULT,
} from '../CustomTopologyConfigField';
import type { TopologyTypeExternalData } from '../TopologyTypeField';
import type { CustomTopologyConfigFieldData } from '../CustomTopologyConfigField';

const { getInitialFieldData } = CustomTopologyConfigFieldWizardField.reducerFunctions;
const CustomTopologyConfigFieldComponent = CustomTopologyConfigFieldWizardField.component;

const mockMultiNodeConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'multi-node-config-1',
  displayName: 'Multi-node Config 1',
  topologyType: TopologyType.MULTI_NODE,
});

const mockMultiNodeConfig2 = mockLLMInferenceServiceConfigK8sResource({
  name: 'multi-node-config-2',
  displayName: 'Multi-node Config 2',
  topologyType: TopologyType.MULTI_NODE,
});

const mockSingleNodePdConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'single-node-pd-config',
  displayName: 'Single Node P/D Config',
  topologyType: TopologyType.SINGLE_NODE_DISAGGREGATED,
});

const emptyConfigsByTopology: Record<
  TopologyType,
  ReturnType<typeof mockLLMInferenceServiceConfigK8sResource>[]
> = {
  [TopologyType.SINGLE_NODE]: [],
  [TopologyType.MULTI_NODE]: [],
  [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
  [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
};

const buildExternalData = (
  overrides: Partial<typeof emptyConfigsByTopology> = {},
): TopologyTypeExternalData => ({
  configsByTopology: Object.assign({}, emptyConfigsByTopology, overrides),
});

describe('CustomTopologyConfigField getInitialFieldData', () => {
  it('should return existing field data when provided (edit flow)', () => {
    const existing: CustomTopologyConfigFieldData = { selectedConfig: mockMultiNodeConfig };
    const externalData = buildExternalData({
      [TopologyType.MULTI_NODE]: [mockMultiNodeConfig],
    });
    const deps = { topologyType: { topologyType: TopologyType.MULTI_NODE } };

    const result = getInitialFieldData(existing, externalData, deps);

    expect(result).toBe(existing);
  });

  it('should preserve configRef from edit extractor for resolution by the component', () => {
    const existing: CustomTopologyConfigFieldData = { configRef: 'some-config' };
    const result = getInitialFieldData(existing);

    expect(result).toBe(existing);
  });

  it('should fall through to defaults when neither selectedConfig nor configRef is set', () => {
    const existing: CustomTopologyConfigFieldData = {};
    const result = getInitialFieldData(existing);

    expect(result).toEqual({ selectedConfig: TOPOLOGY_CONFIG_DEFAULT });
  });

  it('should auto-select first config for multi-node topology', () => {
    const externalData = buildExternalData({
      [TopologyType.MULTI_NODE]: [mockMultiNodeConfig, mockMultiNodeConfig2],
    });
    const deps = { topologyType: { topologyType: TopologyType.MULTI_NODE } };

    const result = getInitialFieldData(undefined, externalData, deps);

    expect(result).toEqual({ selectedConfig: mockMultiNodeConfig });
  });

  it('should auto-select first config for single-node disaggregated topology', () => {
    const externalData = buildExternalData({
      [TopologyType.SINGLE_NODE_DISAGGREGATED]: [mockSingleNodePdConfig],
    });
    const deps = {
      topologyType: { topologyType: TopologyType.SINGLE_NODE_DISAGGREGATED },
    };

    const result = getInitialFieldData(undefined, externalData, deps);

    expect(result).toEqual({ selectedConfig: mockSingleNodePdConfig });
  });

  it('should return default selectedConfig for single-node topology', () => {
    const externalData = buildExternalData({});
    const deps = { topologyType: { topologyType: TopologyType.SINGLE_NODE } };

    const result = getInitialFieldData(undefined, externalData, deps);

    expect(result).toEqual({ selectedConfig: 'default' });
  });

  it('should return undefined selectedConfig when no configs exist for the topology type', () => {
    const externalData = buildExternalData({
      [TopologyType.MULTI_NODE]: [],
    });
    const deps = { topologyType: { topologyType: TopologyType.MULTI_NODE } };

    const result = getInitialFieldData(undefined, externalData, deps);

    expect(result).toEqual({ selectedConfig: undefined });
  });

  it('should return default selectedConfig when dependencies are undefined', () => {
    const externalData = buildExternalData({
      [TopologyType.MULTI_NODE]: [mockMultiNodeConfig],
    });

    const result = getInitialFieldData(undefined, externalData, undefined);

    expect(result).toEqual({ selectedConfig: 'default' });
  });

  it('should return undefined selectedConfig when external data is undefined for non-single-node', () => {
    const deps = { topologyType: { topologyType: TopologyType.MULTI_NODE } };

    const result = getInitialFieldData(undefined, undefined, deps);

    expect(result).toEqual({ selectedConfig: undefined });
  });
});

describe('CustomTopologyConfigField component — edit flow configRef resolution', () => {
  const fieldId = 'llmd-serving/custom-topology-config';

  it('should resolve a compatible configRef and show it selected', async () => {
    const onChange = jest.fn();

    render(
      <CustomTopologyConfigFieldComponent
        id={fieldId}
        value={{ configRef: 'multi-node-config-1' }}
        onChange={onChange}
        externalData={{
          data: {
            configsByTopology: {
              ...emptyConfigsByTopology,
              [TopologyType.MULTI_NODE]: [mockMultiNodeConfig, mockMultiNodeConfig2],
            },
          },
          loaded: true,
        }}
        dependencies={{ topologyType: { topologyType: TopologyType.MULTI_NODE } }}
      />,
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ selectedConfig: mockMultiNodeConfig });
    });
  });

  it('should clear configRef and auto-select when it references a deleted config', async () => {
    const onChange = jest.fn();
    const externalData = {
      data: {
        configsByTopology: {
          ...emptyConfigsByTopology,
          [TopologyType.MULTI_NODE]: [mockMultiNodeConfig],
        },
      },
      loaded: true,
    };
    const deps = { topologyType: { topologyType: TopologyType.MULTI_NODE } };

    const { rerender } = render(
      <CustomTopologyConfigFieldComponent
        id={fieldId}
        value={{ configRef: 'deleted-config' }}
        onChange={onChange}
        externalData={externalData}
        dependencies={deps}
      />,
    );

    // The resolution effect clears configRef when the config isn't found
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ configRef: undefined });
    });

    // Simulate the wizard framework applying the cleared configRef
    rerender(
      <CustomTopologyConfigFieldComponent
        id={fieldId}
        value={{}}
        onChange={onChange}
        externalData={externalData}
        dependencies={deps}
      />,
    );

    // The auto-select effect should now pick the first available config
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ selectedConfig: mockMultiNodeConfig });
    });
  });

  it('should set default when deleted configRef is resolved on single-node topology', async () => {
    const onChange = jest.fn();

    render(
      <CustomTopologyConfigFieldComponent
        id={fieldId}
        value={{ configRef: 'deleted-config' }}
        onChange={onChange}
        externalData={{
          data: { configsByTopology: emptyConfigsByTopology },
          loaded: true,
        }}
        dependencies={{ topologyType: { topologyType: TopologyType.SINGLE_NODE } }}
      />,
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ selectedConfig: TOPOLOGY_CONFIG_DEFAULT });
    });
  });
});
