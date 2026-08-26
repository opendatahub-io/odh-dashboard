import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import {
  AcceleratorConfigFieldWizardField,
  AcceleratorConfigFieldComponent,
  useAcceleratorConfigData,
} from '../AcceleratorConfigField';
import {
  LLMD_DEPLOYMENT_METHOD_KEY,
  SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY,
} from '../deploymentMethodField';
import { ACCELERATOR_CONFIG_DEFAULT } from '../../const';
import { TopologyType, type LLMInferenceServiceConfigKind } from '../../types';
import {
  useFetchLLMInferenceServiceConfig,
  useFetchLLMInferenceServiceConfigs,
} from '../../api/LLMInferenceServiceConfigs';

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'opendatahub' })),
}));

jest.mock('../../api/LLMInferenceServiceConfigs', () => ({
  useFetchLLMInferenceServiceConfigs: jest.fn(),
  useFetchLLMInferenceServiceConfig: jest.fn(),
}));

const mockUseFetchLLMInferenceServiceConfigs = jest.mocked(useFetchLLMInferenceServiceConfigs);
const mockUseFetchLLMInferenceServiceConfig = jest.mocked(useFetchLLMInferenceServiceConfig);

const { isActive, reducerFunctions } = AcceleratorConfigFieldWizardField;

const state = (method: string, topologyType?: TopologyType) => ({
  deploymentMethod: { method },
  'llmd-serving/topology-type': topologyType ? { topologyType } : undefined,
});

describe('AcceleratorConfigFieldWizardField.isActive', () => {
  it('is active for llm-d + single node', () => {
    expect(isActive(state(LLMD_DEPLOYMENT_METHOD_KEY, TopologyType.SINGLE_NODE) as never)).toBe(
      true,
    );
  });

  it('is inactive for the simple vLLM method', () => {
    expect(
      isActive(state(SIMPLE_VLLM_DEPLOYMENT_METHOD_KEY, TopologyType.SINGLE_NODE) as never),
    ).toBe(false);
  });

  it('is inactive for llm-d + multi-node (no supporting configs known at isActive time)', () => {
    expect(isActive(state(LLMD_DEPLOYMENT_METHOD_KEY, TopologyType.MULTI_NODE) as never)).toBe(
      false,
    );
  });

  it('is active for llm-d with no topology field present (llmdTemplates off → implicitly single node)', () => {
    // VLLM_ON_MAAS gates the field, not LLMD_TOPOLOGY_CONFIGS; when the topology field is absent
    // the deployment is implicitly single node and the accelerator field should still show.
    expect(isActive(state(LLMD_DEPLOYMENT_METHOD_KEY) as never)).toBe(true);
  });
});

const makeConfig = (
  name: string,
  recommendedAccelerators?: string,
): LLMInferenceServiceConfigKind => ({
  apiVersion: 'serving.kserve.io/v1alpha2',
  kind: 'LLMInferenceServiceConfig',
  metadata: {
    name,
    namespace: 'dashboard',
    labels: {},
    annotations: recommendedAccelerators
      ? { 'opendatahub.io/recommended-accelerators': recommendedAccelerators }
      : {},
  },
});

describe('AcceleratorConfigFieldWizardField.getInitialFieldData', () => {
  const { getInitialFieldData } = reducerFunctions;

  it('returns existing field data unchanged when already set (edit flow)', () => {
    const existing = { selectedConfig: makeConfig('rocm', '["amd.com/gpu"]') };
    const result = getInitialFieldData(existing, { configs: [] }, {});
    expect(result).toBe(existing);
  });

  it('defaults to the built-in placeholder (Manual) when nothing matches', () => {
    const result = getInitialFieldData(undefined, { configs: [makeConfig('rocm')] }, {});
    expect(result.selectedConfig).toBe(ACCELERATOR_CONFIG_DEFAULT);
    expect(result.autoSelect).toBe(false);
  });

  it('auto-suggests the config compatible with the selected hardware profile and starts on Automatic', () => {
    const rocm = makeConfig('rocm', '["amd.com/gpu"]');
    const hardwareProfile = {
      spec: { identifiers: [{ identifier: 'amd.com/gpu' }] },
    } as never;
    const result = getInitialFieldData(
      undefined,
      { configs: [rocm, makeConfig('cuda')] },
      { hardwareProfile },
    );
    expect(result.selectedConfig).toEqual(rocm);
    expect(result.autoSelect).toBe(true);
  });
});

describe('AcceleratorConfigFieldComponent radio behavior', () => {
  const rocm = makeConfig('rocm', '["amd.com/gpu"]');
  const hardwareProfile = {
    spec: { identifiers: [{ identifier: 'amd.com/gpu' }] },
  } as never;

  const renderComponent = (
    value: React.ComponentProps<typeof AcceleratorConfigFieldComponent>['value'],
    onChange = jest.fn(),
  ) => {
    render(
      <AcceleratorConfigFieldComponent
        id="accelerator-config"
        value={value}
        onChange={onChange}
        externalData={{ data: { configs: [rocm] }, loaded: true }}
        dependencies={{
          topologyFieldData: { topologyType: TopologyType.SINGLE_NODE },
          hardwareProfile,
        }}
        isEditing={false}
      />,
    );
    return onChange;
  };

  it('checks the Automatic radio when the persisted value is autoSelect', () => {
    renderComponent({ selectedConfig: rocm, autoSelect: true });
    expect(screen.getByTestId('model-server-auto-select-radio')).toBeChecked();
    // The read-only suggestion summary renders (not the manual dropdown).
    expect(screen.getByTestId('model-server-auto-select-suggestion')).toBeInTheDocument();
  });

  it('persists autoSelect=true (with the suggested config) when Automatic is clicked', () => {
    // Regression: clicking Automatic used to only change the manual dropdown selection because
    // autoSelect was never persisted, so the radio snapped back to Manual on re-render.
    const onChange = renderComponent({
      selectedConfig: ACCELERATOR_CONFIG_DEFAULT,
      autoSelect: false,
    });
    fireEvent.click(screen.getByTestId('model-server-auto-select-radio'));
    expect(onChange).toHaveBeenCalledWith({ selectedConfig: rocm, autoSelect: true });
  });

  it('persists autoSelect=false when Manual is re-selected', () => {
    const onChange = renderComponent({ selectedConfig: rocm, autoSelect: true });
    fireEvent.click(screen.getByTestId('model-server-manual-select-radio'));
    expect(onChange).toHaveBeenCalledWith({
      selectedConfig: ACCELERATOR_CONFIG_DEFAULT,
      autoSelect: false,
    });
  });
});

describe('AcceleratorConfigFieldComponent edit configRef resolution', () => {
  const rocm = makeConfig('rocm', '["amd.com/gpu"]');

  const renderWithConfigs = (
    value: React.ComponentProps<typeof AcceleratorConfigFieldComponent>['value'],
    configs: LLMInferenceServiceConfigKind[],
  ) => {
    const onChange = jest.fn();
    render(
      <AcceleratorConfigFieldComponent
        id="accelerator-config"
        value={value}
        onChange={onChange}
        externalData={{ data: { configs }, loaded: true }}
        dependencies={{ topologyFieldData: { topologyType: TopologyType.SINGLE_NODE } }}
        isEditing={false}
      />,
    );
    return onChange;
  };

  it('lists accelerator configs when no topology field is present (llmdTemplates off)', () => {
    // Regression: with the topology field absent the deployment is implicitly single-node, so
    // single-node configs must still be selectable. Previously visibleConfigs was empty here, so the
    // Manual dropdown only offered the built-in option in the vLLMDeploymentOnMaaS-on/llmdTemplates-off combo.
    const onChange = jest.fn();
    render(
      <AcceleratorConfigFieldComponent
        id="accelerator-config"
        value={{ selectedConfig: ACCELERATOR_CONFIG_DEFAULT, autoSelect: false }}
        onChange={onChange}
        externalData={{ data: { configs: [rocm] }, loaded: true }}
        dependencies={{}}
        isEditing={false}
      />,
    );
    fireEvent.click(screen.getByTestId('serving-runtime-template-selection-toggle'));
    expect(screen.getByTestId(`servingRuntime ${rocm.metadata.name}`)).toBeInTheDocument();
  });

  it('labels a config from the deployment project namespace as project-scoped', () => {
    // The local copy created at deploy time lives in the deployment's project namespace and is folded
    // into the list on edit; it must render under the project-scoped group, not global.
    const localCopy: LLMInferenceServiceConfigKind = {
      ...makeConfig('my-deployment-rocm'),
      metadata: { name: 'my-deployment-rocm', namespace: 'my-project', labels: {} },
    };
    const onChange = jest.fn();
    render(
      <AcceleratorConfigFieldComponent
        id="accelerator-config"
        value={{ selectedConfig: localCopy, autoSelect: false }}
        onChange={onChange}
        externalData={{ data: { configs: [localCopy] }, loaded: true }}
        dependencies={{
          topologyFieldData: { topologyType: TopologyType.SINGLE_NODE },
          project: { projectName: 'my-project', setProjectName: jest.fn() },
        }}
        isEditing={false}
      />,
    );
    fireEvent.click(screen.getByTestId('serving-runtime-template-selection-toggle'));
    const menuItem = screen.getByTestId('servingRuntime my-deployment-rocm');
    expect(
      within(screen.getByTestId('project-scoped-serving-runtimes')).getByTestId(
        'servingRuntime my-deployment-rocm',
      ),
    ).toBe(menuItem);
  });

  it('resolves a configRef into the referenced config on edit', () => {
    const onChange = renderWithConfigs({ configRef: 'rocm' }, [rocm]);
    expect(onChange).toHaveBeenCalledWith({ selectedConfig: rocm });
  });

  it('clears an unresolvable configRef', () => {
    // The project-namespace copy was deleted/renamed/unreadable, so the ref can't resolve to a
    // config. (Robustly falling back to a representable state when this happens on edit is deferred
    // to a follow-up that fixes the pattern across the llm-d config fields uniformly.)
    const onChange = renderWithConfigs({ configRef: 'missing-copy' }, [rocm]);
    expect(onChange).toHaveBeenCalledWith({ configRef: undefined });
  });
});

describe('useAcceleratorConfigData', () => {
  const mockProject = { projectName: 'my-project', setProjectName: jest.fn() };

  const setDashboardConfigs = (configs: LLMInferenceServiceConfigKind[]) => {
    mockUseFetchLLMInferenceServiceConfigs.mockReturnValue({
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
    setDashboardConfigs([makeConfig('rocm')]);
    setReferencedConfig(null);
  });

  it('returns the enabled dashboard configs', () => {
    const renderResult = testHook(useAcceleratorConfigData)({});
    expect(renderResult.result.current.data.configs).toEqual([makeConfig('rocm')]);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('fetches the referenced config by name from the project namespace (edit flow)', () => {
    testHook(useAcceleratorConfigData)({
      configRef: 'my-deployment-rocm',
      project: mockProject,
    });
    expect(mockUseFetchLLMInferenceServiceConfig).toHaveBeenCalledWith(
      'my-deployment-rocm',
      'my-project',
    );
  });

  it('folds the referenced local-copy config into the configs so edit can resolve it', () => {
    // The persisted accelerator baseRef points at a project-namespace local copy that is NOT in the
    // dashboard config list; it must be added so the edit form can pre-select it.
    const localCopy: LLMInferenceServiceConfigKind = {
      ...makeConfig('my-deployment-rocm'),
      metadata: { name: 'my-deployment-rocm', namespace: 'my-project', labels: {} },
    };
    setReferencedConfig(localCopy);

    const renderResult = testHook(useAcceleratorConfigData)({
      configRef: 'my-deployment-rocm',
      project: mockProject,
    });

    expect(renderResult.result.current.data.configs).toEqual([makeConfig('rocm'), localCopy]);
  });

  it('does not duplicate the referenced config if it is already a dashboard config', () => {
    setReferencedConfig(makeConfig('rocm'));
    const renderResult = testHook(useAcceleratorConfigData)({
      configRef: 'rocm',
      project: mockProject,
    });
    expect(renderResult.result.current.data.configs).toEqual([makeConfig('rocm')]);
  });
});
