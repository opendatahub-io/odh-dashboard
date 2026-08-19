import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { TopologyType, type LLMInferenceServiceConfigKind } from '../../types';
import {
  CustomTopologyConfigFieldWizardField,
  TOPOLOGY_CONFIG_DEFAULT,
} from '../CustomTopologyConfigField';
import type { CustomTopologyConfigFieldData } from '../CustomTopologyConfigField';
import type { TopologyTypeExternalData } from '../TopologyTypeField';

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

const mockLocalConfig: LLMInferenceServiceConfigKind = (() => {
  const base = mockLLMInferenceServiceConfigK8sResource({
    name: 'my-model-multi-node-config-1',
    namespace: 'my-project',
    displayName: 'Multi-node Config 1 (Local Copy)',
    topologyType: TopologyType.MULTI_NODE,
  });
  return {
    ...base,
    metadata: {
      ...base.metadata,
      labels: { 'opendatahub.io/config-type': TopologyType.MULTI_NODE },
    },
  };
})();

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
          data: buildExternalData({
            [TopologyType.MULTI_NODE]: [mockMultiNodeConfig, mockMultiNodeConfig2],
          }),
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
      data: buildExternalData({ [TopologyType.MULTI_NODE]: [mockMultiNodeConfig] }),
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
          data: buildExternalData(),
          loaded: true,
        }}
        dependencies={{ topologyType: { topologyType: TopologyType.SINGLE_NODE } }}
      />,
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ selectedConfig: TOPOLOGY_CONFIG_DEFAULT });
    });
  });

  it('should resolve a configRef that points at the project namespace copy of a config', async () => {
    const onChange = jest.fn();

    render(
      <CustomTopologyConfigFieldComponent
        id={fieldId}
        value={{ configRef: 'my-model-multi-node-config-1' }}
        onChange={onChange}
        externalData={{
          data: buildExternalData({
            [TopologyType.MULTI_NODE]: [mockMultiNodeConfig, mockLocalConfig],
          }),
          loaded: true,
        }}
        dependencies={{ topologyType: { topologyType: TopologyType.MULTI_NODE } }}
      />,
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ selectedConfig: mockLocalConfig });
    });
    expect(onChange).not.toHaveBeenCalledWith({ configRef: undefined });
  });

  it('should show the project namespace copy of a config as an option', async () => {
    render(
      <CustomTopologyConfigFieldComponent
        id={fieldId}
        value={{ selectedConfig: mockLocalConfig }}
        onChange={jest.fn()}
        externalData={{
          data: buildExternalData({
            [TopologyType.MULTI_NODE]: [mockMultiNodeConfig, mockLocalConfig],
          }),
          loaded: true,
        }}
        dependencies={{ topologyType: { topologyType: TopologyType.MULTI_NODE } }}
      />,
    );

    fireEvent.click(screen.getByTestId('custom-topology-config-select'));

    expect(
      await screen.findByTestId('topology-config-option-my-model-multi-node-config-1'),
    ).toBeInTheDocument();
  });
});

describe('CustomTopologyConfigField resolveDependencies', () => {
  const { resolveDependencies } = CustomTopologyConfigFieldWizardField.reducerFunctions;

  it('should expose the configRef from the initial data so only that config is fetched', () => {
    const result = resolveDependencies?.(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      {
        'llmd-serving/custom-topology-config': { configRef: 'my-model-multi-node-config-1' },
      },
    );

    expect(result?.configRef).toBe('my-model-multi-node-config-1');
  });

  it('should not expose a configRef when the initial data has no ref', () => {
    const result = resolveDependencies?.(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      { 'llmd-serving/custom-topology-config': { selectedConfig: mockMultiNodeConfig } },
    );

    expect(result?.configRef).toBeUndefined();
  });

  it('should expose the current topology type from the form state', () => {
    const result = resolveDependencies?.(
      {
        'llmd-serving/topology-type': { topologyType: TopologyType.MULTI_NODE },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      undefined,
    );

    expect(result?.topologyType).toEqual({ topologyType: TopologyType.MULTI_NODE });
  });
});
