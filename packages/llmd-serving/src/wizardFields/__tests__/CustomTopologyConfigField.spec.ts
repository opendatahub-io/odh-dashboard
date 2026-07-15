import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { TopologyType } from '../../types';
import { CustomTopologyConfigFieldWizardField } from '../CustomTopologyConfigField';
import type { TopologyTypeExternalData } from '../TopologyTypeField';
import type { CustomTopologyConfigFieldData } from '../CustomTopologyConfigField';

const { getInitialFieldData } = CustomTopologyConfigFieldWizardField.reducerFunctions;

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

  it('should return existing field data with configRef when provided (edit extractor)', () => {
    const existing: CustomTopologyConfigFieldData = { configRef: 'some-config' };
    const result = getInitialFieldData(existing);

    expect(result).toBe(existing);
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
