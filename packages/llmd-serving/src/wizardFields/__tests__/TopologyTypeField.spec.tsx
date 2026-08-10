import React, { act } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { LlmdTrackingEvent } from '../../tracking/llmdTrackingConstants';
import { TopologyType, TopologyTypeLabels, type LLMInferenceServiceConfigKind } from '../../types';
import {
  TopologyTypeFieldWizardField,
  useTopologyTypeData,
  type TopologyTypeExternalData,
  type TopologyTypeFieldData,
} from '../TopologyTypeField';
import {
  useFetchTopologyConfigs,
  useFetchLLMInferenceServiceConfig,
} from '../../api/LLMInferenceServiceConfigs';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'opendatahub' })),
}));

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  useFetchTopologyConfigs: jest.fn(),
  useFetchLLMInferenceServiceConfig: jest.fn(),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);
const mockUseFetchTopologyConfigs = jest.mocked(useFetchTopologyConfigs);
const mockUseFetchLLMInferenceServiceConfig = jest.mocked(useFetchLLMInferenceServiceConfig);

const TopologyTypeFieldComponent = TopologyTypeFieldWizardField.component;

const mockMultiNodeConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'multi-node-config-1',
  displayName: 'Multi-node Config 1',
  topologyType: TopologyType.MULTI_NODE,
});

/**
 * The copy of a config that deploy makes in the deployment's own project namespace. It carries the
 * config type label over from the source config, but not the dashboard label — it is looked up by
 * name rather than listed alongside the administrator-defined configs.
 */
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

describe('TopologyTypeField tracking', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = ({
    value,
    externalData,
  }: {
    value?: TopologyTypeFieldData;
    externalData?: { data: TopologyTypeExternalData; loaded: boolean; loadError?: Error };
  } = {}) =>
    render(
      <TopologyTypeFieldComponent
        id="llmd-serving/topology-type"
        value={value}
        onChange={mockOnChange}
        externalData={externalData}
      />,
    );

  const openDropdown = async () => {
    await act(async () => {
      fireEvent.click(screen.getByTestId('topology-type-select'));
    });
  };

  // The test id lands on the list item; aria-disabled lives on the option itself.
  const getMultiNodeOption = () =>
    within(screen.getByTestId(`topology-type-${TopologyType.MULTI_NODE}`)).getByRole('option');

  it('should fire topology type selected tracking with undefined previousPattern on first selection', async () => {
    renderComponent({
      externalData: {
        data: {
          configsByTopology: {
            [TopologyType.SINGLE_NODE]: [],
            [TopologyType.MULTI_NODE]: [],
            [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
            [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
          },
        },
        loaded: true,
      },
    });

    await openDropdown();

    await act(async () => {
      fireEvent.click(screen.getByText(TopologyTypeLabels[TopologyType.SINGLE_NODE]));
    });

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      LlmdTrackingEvent.TOPOLOGY_TYPE_SELECTED,
      {
        llmdComposablePattern: TopologyType.SINGLE_NODE,
        previousPattern: undefined,
      },
    );
  });

  it('should fire topology type selected tracking with previous pattern when switching', async () => {
    renderComponent({
      value: { topologyType: TopologyType.SINGLE_NODE },
      externalData: {
        data: {
          configsByTopology: {
            [TopologyType.SINGLE_NODE]: [],
            [TopologyType.MULTI_NODE]: [{ metadata: { name: 'multi-config' } } as never],
            [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
            [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
          },
        },
        loaded: true,
      },
    });

    await openDropdown();

    await act(async () => {
      fireEvent.click(screen.getByText(TopologyTypeLabels[TopologyType.MULTI_NODE]));
    });

    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
      LlmdTrackingEvent.TOPOLOGY_TYPE_SELECTED,
      {
        llmdComposablePattern: TopologyType.MULTI_NODE,
        previousPattern: TopologyType.SINGLE_NODE,
      },
    );
  });

  it('should call onChange with the selected topology type', async () => {
    renderComponent({
      externalData: {
        data: {
          configsByTopology: {
            [TopologyType.SINGLE_NODE]: [],
            [TopologyType.MULTI_NODE]: [],
            [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
            [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
          },
        },
        loaded: true,
      },
    });

    await openDropdown();

    await act(async () => {
      fireEvent.click(screen.getByText(TopologyTypeLabels[TopologyType.SINGLE_NODE]));
    });

    expect(mockOnChange).toHaveBeenCalledWith({
      topologyType: TopologyType.SINGLE_NODE,
    });
  });

  it('should render all topology type options', async () => {
    renderComponent({
      externalData: {
        data: {
          configsByTopology: {
            [TopologyType.SINGLE_NODE]: [],
            [TopologyType.MULTI_NODE]: [],
            [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
            [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
          },
        },
        loaded: true,
      },
    });

    await openDropdown();

    expect(screen.getByText(TopologyTypeLabels[TopologyType.SINGLE_NODE])).toBeInTheDocument();
    expect(screen.getByText(TopologyTypeLabels[TopologyType.MULTI_NODE])).toBeInTheDocument();
    expect(
      screen.getByText(TopologyTypeLabels[TopologyType.SINGLE_NODE_DISAGGREGATED]),
    ).toBeInTheDocument();
    expect(
      screen.getByText(TopologyTypeLabels[TopologyType.MULTI_NODE_DISAGGREGATED]),
    ).toBeInTheDocument();
  });

  it('should disable a topology type that has no configurations', async () => {
    renderComponent({
      externalData: {
        data: {
          configsByTopology: {
            [TopologyType.SINGLE_NODE]: [],
            [TopologyType.MULTI_NODE]: [],
            [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
            [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
          },
        },
        loaded: true,
      },
    });

    await openDropdown();

    expect(getMultiNodeOption()).toHaveAttribute('aria-disabled', 'true');
  });

  it('should not disable a topology type whose only configuration is the project namespace copy', async () => {
    renderComponent({
      externalData: {
        data: {
          configsByTopology: {
            [TopologyType.SINGLE_NODE]: [],
            [TopologyType.MULTI_NODE]: [mockLocalConfig],
            [TopologyType.SINGLE_NODE_DISAGGREGATED]: [],
            [TopologyType.MULTI_NODE_DISAGGREGATED]: [],
          },
        },
        loaded: true,
      },
    });

    await openDropdown();

    expect(getMultiNodeOption()).not.toHaveAttribute('aria-disabled', 'true');
  });
});

describe('useTopologyTypeData', () => {
  const mockProject = { projectName: 'my-project', setProjectName: jest.fn() };

  const setDashboardConfigs = (configs: LLMInferenceServiceConfigKind[]) => {
    mockUseFetchTopologyConfigs.mockReturnValue({
      data: configs,
      loaded: true,
      refresh: jest.fn(),
    });
  };

  const setReferencedConfig = (
    config: LLMInferenceServiceConfigKind | null,
    { loaded = true, error }: { loaded?: boolean; error?: Error } = {},
  ) => {
    mockUseFetchLLMInferenceServiceConfig.mockReturnValue({
      data: config,
      loaded,
      error,
      refresh: jest.fn(),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setDashboardConfigs([mockMultiNodeConfig]);
    setReferencedConfig(null);
  });

  it('should group the dashboard configs by topology type', () => {
    const renderResult = testHook(useTopologyTypeData)({});

    const { configsByTopology } = renderResult.result.current.data;
    expect(configsByTopology[TopologyType.MULTI_NODE]).toEqual([mockMultiNodeConfig]);
    expect(configsByTopology[TopologyType.SINGLE_NODE]).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should skip disabled dashboard configs', () => {
    const disabledConfig = mockLLMInferenceServiceConfigK8sResource({
      name: 'disabled-config',
      topologyType: TopologyType.MULTI_NODE,
    });
    disabledConfig.metadata.annotations = {
      ...disabledConfig.metadata.annotations,
      'opendatahub.io/disabled': 'true',
    };
    setDashboardConfigs([mockMultiNodeConfig, disabledConfig]);

    const renderResult = testHook(useTopologyTypeData)({});

    expect(renderResult.result.current.data.configsByTopology[TopologyType.MULTI_NODE]).toEqual([
      mockMultiNodeConfig,
    ]);
  });

  it('should fetch the referenced config from the project namespace', () => {
    testHook(useTopologyTypeData)({
      configRef: 'my-model-multi-node-config-1',
      project: mockProject,
    });

    expect(mockUseFetchLLMInferenceServiceConfig).toHaveBeenCalledWith(
      'my-model-multi-node-config-1',
      'my-project',
    );
  });

  it('should add the referenced config to the configs for its own topology type', () => {
    setReferencedConfig(mockLocalConfig);

    const renderResult = testHook(useTopologyTypeData)({
      configRef: 'my-model-multi-node-config-1',
      project: mockProject,
    });

    const { configsByTopology } = renderResult.result.current.data;
    expect(configsByTopology[TopologyType.MULTI_NODE]).toEqual([
      mockMultiNodeConfig,
      mockLocalConfig,
    ]);
    expect(configsByTopology[TopologyType.SINGLE_NODE]).toEqual([]);
  });

  it('should not duplicate a referenced config that is already a dashboard config', () => {
    setReferencedConfig(mockMultiNodeConfig);

    const renderResult = testHook(useTopologyTypeData)({
      configRef: 'multi-node-config-1',
      project: mockProject,
    });

    expect(renderResult.result.current.data.configsByTopology[TopologyType.MULTI_NODE]).toEqual([
      mockMultiNodeConfig,
    ]);
  });

  it('should not add a referenced config that has no topology type', () => {
    setReferencedConfig(mockLLMInferenceServiceConfigK8sResource({ name: 'router-config' }));

    const renderResult = testHook(useTopologyTypeData)({
      configRef: 'router-config',
      project: mockProject,
    });

    expect(renderResult.result.current.data.configsByTopology[TopologyType.MULTI_NODE]).toEqual([
      mockMultiNodeConfig,
    ]);
  });

  it("should fall back to the deployment's topology type for a copy that carries no config type", () => {
    // Copies created before the config type label was carried over have no config type at all
    const untypedCopy = mockLLMInferenceServiceConfigK8sResource({
      name: 'my-model-single-node-config',
      namespace: 'my-project',
    });
    untypedCopy.metadata.labels = {};
    setReferencedConfig(untypedCopy);

    const renderResult = testHook(useTopologyTypeData)({
      configRef: 'my-model-single-node-config',
      project: mockProject,
      initialTopologyType: TopologyType.SINGLE_NODE,
    });

    expect(renderResult.result.current.data.configsByTopology[TopologyType.SINGLE_NODE]).toEqual([
      untypedCopy,
    ]);
  });

  it("should prefer the copy's own topology type over the deployment's", () => {
    setReferencedConfig(mockLocalConfig);

    const renderResult = testHook(useTopologyTypeData)({
      configRef: 'my-model-multi-node-config-1',
      project: mockProject,
      initialTopologyType: TopologyType.SINGLE_NODE,
    });

    const { configsByTopology } = renderResult.result.current.data;
    expect(configsByTopology[TopologyType.MULTI_NODE]).toContain(mockLocalConfig);
    expect(configsByTopology[TopologyType.SINGLE_NODE]).toEqual([]);
  });

  it('should stay unloaded while the referenced config is still being fetched', () => {
    setReferencedConfig(null, { loaded: false });

    const renderResult = testHook(useTopologyTypeData)({
      configRef: 'my-model-multi-node-config-1',
      project: mockProject,
    });

    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should surface a load error when the referenced config cannot be read', () => {
    const referencedError = new Error('Forbidden');
    setReferencedConfig(null, { loaded: false, error: referencedError });

    const renderResult = testHook(useTopologyTypeData)({
      configRef: 'my-model-multi-node-config-1',
      project: mockProject,
    });

    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.loadError).toBe(referencedError);
  });

  it('should load without a load error when the referenced config no longer exists', () => {
    setReferencedConfig(null);

    const renderResult = testHook(useTopologyTypeData)({
      configRef: 'my-model-multi-node-config-1',
      project: mockProject,
    });

    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.loadError).toBeUndefined();
  });
});

describe('TopologyTypeField resolveDependencies', () => {
  const { resolveDependencies } = TopologyTypeFieldWizardField.reducerFunctions;

  it('should expose the configRef from the initial data so the referenced config is fetched', () => {
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

  it("should expose the deployment's topology type from the initial data", () => {
    const result = resolveDependencies?.(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      { 'llmd-serving/topology-type': { topologyType: TopologyType.MULTI_NODE } },
    );

    expect(result?.initialTopologyType).toBe(TopologyType.MULTI_NODE);
  });

  it('should not expose an initial topology type for a new deployment', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = resolveDependencies?.({} as any, undefined);

    expect(result?.initialTopologyType).toBeUndefined();
  });

  it('should not expose a configRef when the field value changes (avoiding a circular dependency)', () => {
    const result = resolveDependencies?.(
      {
        'llmd-serving/custom-topology-config': { configRef: 'my-model-multi-node-config-1' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      undefined,
    );

    expect(result?.configRef).toBeUndefined();
  });
});
