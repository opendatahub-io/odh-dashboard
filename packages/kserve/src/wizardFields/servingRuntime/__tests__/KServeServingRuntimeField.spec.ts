import {
  ServingRuntimeModelType,
  getServingRuntimeFromTemplate,
} from '@odh-dashboard/model-serving/shared';
import { IdentifierResourceType } from '@odh-dashboard/k8s-core';
import { mockHardwareProfile } from '@odh-dashboard/hardware-profiles/__mocks__/mockHardwareProfile';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import * as hostApi from '@odh-dashboard/plugin-core/host-api';
import * as servingRuntimeTemplates from '@odh-dashboard/model-serving/concepts/useServingRuntimeTemplates';
import * as clusterSettings from '@odh-dashboard/model-serving/concepts/useModelServingClusterSettings';
import * as wizardFields from '@odh-dashboard/model-serving/shared/wizard-fields';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  isKServeServingRuntimeFieldActive,
  useKServeServingRuntimeExternalData,
  resolveInitialModelServerFieldData,
  KServeServingRuntimeFieldWizardField,
} from '../KServeServingRuntimeField';
import { LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY } from '../../deploymentMethodField';

jest.mock('@odh-dashboard/plugin-core/host-api', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/host-api'),
  useDashboardNamespace: jest.fn(),
}));
jest.mock('@odh-dashboard/model-serving/concepts/useServingRuntimeTemplates');
jest.mock('@odh-dashboard/model-serving/concepts/useModelServingClusterSettings');
jest.mock('@odh-dashboard/model-serving/shared/wizard-fields', () => {
  const actual = jest.requireActual('@odh-dashboard/model-serving/shared/wizard-fields');
  return {
    ...actual,
    useWizardFieldOverrides: jest.fn(() => []),
  };
});

const mockUseDashboardNamespace = jest.mocked(hostApi.useDashboardNamespace);
const mockUseServingRuntimeTemplates = jest.mocked(
  servingRuntimeTemplates.useServingRuntimeTemplates,
);
const mockUseModelServingClusterSettings = jest.mocked(
  clusterSettings.useModelServingClusterSettings,
);
const mockUseWizardFieldOverrides = jest.mocked(wizardFields.useWizardFieldOverrides);

describe('isKServeServingRuntimeFieldActive', () => {
  it('should be active for predictive models', () => {
    expect(
      isKServeServingRuntimeFieldActive({
        modelType: { data: { type: ServingRuntimeModelType.PREDICTIVE } },
      }),
    ).toBe(true);
  });

  it('should be active for generative models with the legacy deployment method', () => {
    expect(
      isKServeServingRuntimeFieldActive({
        modelType: { data: { type: ServingRuntimeModelType.GENERATIVE } },
        deploymentMethod: { method: LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY },
      }),
    ).toBe(true);
  });

  it('should be inactive for generative models without the legacy deployment method', () => {
    expect(
      isKServeServingRuntimeFieldActive({
        modelType: { data: { type: ServingRuntimeModelType.GENERATIVE } },
        deploymentMethod: { method: 'llmd' },
      }),
    ).toBe(false);
  });

  it('should be inactive when model type is not set', () => {
    expect(isKServeServingRuntimeFieldActive({})).toBe(false);
  });
});

describe('resolveInitialModelServerFieldData', () => {
  const templateWithAccelerator = (name: string, accelerator: string) => {
    const result = mockServingRuntimeTemplateK8sResource({ name });
    const runtimeObject = result.objects[0];
    runtimeObject.metadata.annotations = {
      ...runtimeObject.metadata.annotations,
      'opendatahub.io/recommended-accelerators': JSON.stringify([accelerator]),
    };
    return result;
  };
  const gpuProfile = mockHardwareProfile({
    identifiers: [
      {
        identifier: 'nvidia.com/gpu',
        displayName: 'GPU',
        resourceType: IdentifierResourceType.ACCELERATOR,
        defaultCount: 1,
        minCount: 1,
        maxCount: 4,
      },
    ],
  });
  const template = mockServingRuntimeTemplateK8sResource({
    name: 'sr-template',
    namespace: 'opendatahub',
  });

  it('should attach the matched template when editing without a template object', () => {
    const result = resolveInitialModelServerFieldData(
      {
        data: {
          selection: {
            name: 'sr-template',
            namespace: 'opendatahub',
            label: 'Serving Runtime',
          },
        },
      },
      { templates: [template], extraOptions: [] },
    );

    expect(result.data?.selection?.template).toBe(template);
  });

  it('should preserve an existing selection that already has a template', () => {
    const existing = {
      data: {
        selection: {
          name: 'sr-template',
          namespace: 'opendatahub',
          label: 'Serving Runtime',
          template,
        },
      },
    };

    expect(
      resolveInitialModelServerFieldData(existing, { templates: [template], extraOptions: [] }),
    ).toBe(existing);
  });

  it('should keep the extracted selection when templates have not loaded yet', () => {
    const existing = {
      data: {
        selection: {
          name: 'sr-template',
          namespace: 'opendatahub',
          label: 'Serving Runtime',
        },
      },
    };

    expect(resolveInitialModelServerFieldData(existing, { templates: [], extraOptions: [] })).toBe(
      existing,
    );
  });

  it('should exclude an accelerator-compatible template that does not support the model format', () => {
    const nvidiaVllm = templateWithAccelerator('nvidia-vllm', 'nvidia.com/gpu');
    const runtime = getServingRuntimeFromTemplate(nvidiaVllm);
    if (!runtime) {
      throw new Error('Expected a ServingRuntime in the template mock');
    }
    runtime.spec.supportedModelFormats = [{ name: 'vLLM' }];
    const result = resolveInitialModelServerFieldData(
      undefined,
      { templates: [nvidiaVllm], extraOptions: [] },
      { modelFormat: { name: 'onnx', version: '1' }, hardwareProfile: gpuProfile },
    );

    expect(result.data?.autoSelect).toBe(false);
    expect(result.data?.selection).toBeUndefined();
  });

  it('should auto-select a single compatible template when an accelerator identifier is present', () => {
    const compatible = templateWithAccelerator('compatible', 'nvidia.com/gpu');
    const result = resolveInitialModelServerFieldData(
      undefined,
      { templates: [compatible], extraOptions: [] },
      { modelFormat: { name: 'onnx', version: '1' }, hardwareProfile: gpuProfile },
    );

    expect(result.data?.autoSelect).toBe(true);
    expect(result.data?.selection?.name).toBe('compatible');
  });

  it('should not auto-select when there are zero compatible templates', () => {
    const incompatible = templateWithAccelerator('incompatible', 'amd.com/gpu');
    const result = resolveInitialModelServerFieldData(
      undefined,
      { templates: [incompatible], extraOptions: [] },
      { modelFormat: { name: 'onnx', version: '1' }, hardwareProfile: gpuProfile },
    );

    expect(result.data?.autoSelect).toBe(false);
    expect(result.data?.selection).toBeUndefined();
  });

  it('should choose the first compatible template in the filtered template order', () => {
    const incompatible = templateWithAccelerator('incompatible', 'amd.com/gpu');
    const firstCompatible = templateWithAccelerator('first-compatible', 'nvidia.com/gpu');
    const secondCompatible = templateWithAccelerator('second-compatible', 'nvidia.com/gpu');
    const result = resolveInitialModelServerFieldData(
      undefined,
      { templates: [incompatible, firstCompatible, secondCompatible], extraOptions: [] },
      { modelFormat: { name: 'onnx', version: '1' }, hardwareProfile: gpuProfile },
    );

    expect(result.data?.autoSelect).toBe(true);
    expect(result.data?.selection?.name).toBe('first-compatible');
  });

  it('should not auto-select without a hardware profile accelerator, even for one match', () => {
    const compatible = templateWithAccelerator('compatible', 'nvidia.com/gpu');
    const cpuProfile = mockHardwareProfile({
      identifiers: [
        {
          identifier: 'cpu',
          displayName: 'CPU',
          resourceType: IdentifierResourceType.CPU,
          defaultCount: 1,
          minCount: 1,
          maxCount: 4,
        },
      ],
    });
    const dependencies = { modelFormat: { name: 'onnx', version: '1' } };

    const withoutProfile = resolveInitialModelServerFieldData(
      undefined,
      { templates: [compatible], extraOptions: [] },
      dependencies,
    );
    const cpuOnlyProfile = resolveInitialModelServerFieldData(
      undefined,
      { templates: [compatible], extraOptions: [] },
      { ...dependencies, hardwareProfile: cpuProfile },
    );

    expect(withoutProfile.data?.autoSelect).toBe(false);
    expect(withoutProfile.data?.selection).toBeUndefined();
    expect(cpuOnlyProfile.data?.autoSelect).toBe(false);
    expect(cpuOnlyProfile.data?.selection).toBeUndefined();
  });

  it('should use an override suggestion when there is no existing selection', () => {
    const suggestion = {
      name: 'suggested',
      label: 'Suggested',
      template,
    };

    expect(
      resolveInitialModelServerFieldData(undefined, {
        templates: [template],
        extraOptions: [],
        suggestion,
      }),
    ).toEqual({
      data: {
        selection: suggestion,
        autoSelect: true,
        suggestion,
      },
    });
  });
});

describe('useKServeServingRuntimeExternalData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDashboardNamespace.mockReturnValue({ dashboardNamespace: 'opendatahub' });
    mockUseServingRuntimeTemplates.mockReturnValue([[], true, undefined]);
    mockUseModelServingClusterSettings.mockReturnValue({
      data: null,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });
    mockUseWizardFieldOverrides.mockReturnValue([]);
  });

  it('should reuse ModelFormat templates for predictive models without fetching', () => {
    const template = mockServingRuntimeTemplateK8sResource({});

    const renderResult = testHook(useKServeServingRuntimeExternalData)({
      modelType: { type: ServingRuntimeModelType.PREDICTIVE },
      templatesFromModelFormat: [template],
      modelFormatLoaded: true,
    });

    expect(mockUseServingRuntimeTemplates).toHaveBeenNthCalledWith(1, undefined, false);
    expect(mockUseServingRuntimeTemplates).toHaveBeenNthCalledWith(2, undefined, false);
    expect(renderResult.result.current.data.templates).toEqual([template]);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should fetch templates for generative legacy without duplicating ModelFormat watches', () => {
    const template = mockServingRuntimeTemplateK8sResource({});
    mockUseServingRuntimeTemplates.mockImplementation((namespace?: string, enabled = true) => {
      if (!enabled) {
        return [[], true, undefined];
      }
      return [[template], true, undefined];
    });

    const renderResult = testHook(useKServeServingRuntimeExternalData)({
      modelType: { type: ServingRuntimeModelType.GENERATIVE },
      deploymentMethod: LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY,
    });

    expect(mockUseServingRuntimeTemplates).toHaveBeenNthCalledWith(1, undefined, true);
    expect(mockUseServingRuntimeTemplates).toHaveBeenNthCalledWith(2, undefined, false);
    expect(renderResult.result.current.data.templates).toEqual([template]);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should ignore ModelFormat template identity churn on the generative fetch path', () => {
    const template = mockServingRuntimeTemplateK8sResource({});
    // Stable array identities — mirrors EMPTY_TEMPLATE_LIST / memoized results in the real hook.
    const fetchedTemplates = [template];
    const stableDisabledTemplates: typeof fetchedTemplates = [];
    mockUseServingRuntimeTemplates.mockImplementation((_namespace?: string, enabled = true) => {
      if (!enabled) {
        return [stableDisabledTemplates, true, undefined];
      }
      return [fetchedTemplates, true, undefined];
    });

    const modelType = { type: ServingRuntimeModelType.GENERATIVE };
    const baseDeps = {
      modelType,
      deploymentMethod: LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY,
      modelFormatLoaded: true,
    };

    const renderResult = testHook(useKServeServingRuntimeExternalData)({
      ...baseDeps,
      templatesFromModelFormat: [],
    });

    const firstTemplates = renderResult.result.current.data.templates;
    renderResult.rerender({
      ...baseDeps,
      // New array identity (and different contents) must not invalidate generative fetches.
      templatesFromModelFormat: [mockServingRuntimeTemplateK8sResource({ name: 'other' })],
    });

    expect(renderResult.result.current.data.templates).toBe(firstTemplates);
    expect(renderResult.result.current.data.templates).toEqual([template]);
  });

  it('should also load project-scoped templates when generative and project differs', () => {
    const globalTemplate = mockServingRuntimeTemplateK8sResource({ name: 'global-sr' });
    const projectTemplate = mockServingRuntimeTemplateK8sResource({ name: 'project-sr' });
    mockUseServingRuntimeTemplates.mockImplementation((namespace?: string, enabled = true) => {
      if (!enabled) {
        return [[], true, undefined];
      }
      if (namespace === 'my-project') {
        return [[projectTemplate], true, undefined];
      }
      return [[globalTemplate], true, undefined];
    });

    const renderResult = testHook(useKServeServingRuntimeExternalData)({
      modelType: { type: ServingRuntimeModelType.GENERATIVE },
      deploymentMethod: LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY,
      projectName: 'my-project',
    });

    expect(mockUseServingRuntimeTemplates).toHaveBeenCalledWith('my-project', true);
    expect(renderResult.result.current.data.templates).toEqual([projectTemplate, globalTemplate]);
  });

  it('should surface cluster settings errors in loadError', () => {
    const clusterError = new Error('cluster settings failed');
    mockUseModelServingClusterSettings.mockReturnValue({
      data: null,
      loaded: true,
      error: clusterError,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useKServeServingRuntimeExternalData)({
      modelType: { type: ServingRuntimeModelType.PREDICTIVE },
      templatesFromModelFormat: [],
      modelFormatLoaded: true,
    });

    expect(renderResult.result.current.loadError).toBe(clusterError);
  });

  it('should exclude non-Template-backed override suggestion and extraOptions on the legacy path', () => {
    const template = mockServingRuntimeTemplateK8sResource({ name: 'template-backed' });
    const llmdOption = {
      name: 'llmd-serving',
      label: 'Distributed inference with llm-d',
    };
    const templateBackedOption = {
      name: 'template-backed',
      label: 'Template backed runtime',
      template,
    };
    mockUseWizardFieldOverrides.mockReturnValue([
      {
        id: 'modelServerTemplate',
        type: 'modifier',
        isActive: () => true,
        extraOptions: [llmdOption, templateBackedOption],
        suggestion: () => llmdOption,
      },
    ]);
    mockUseModelServingClusterSettings.mockReturnValue({
      data: { isLLMdDefault: true },
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useKServeServingRuntimeExternalData)({
      modelType: { type: ServingRuntimeModelType.GENERATIVE },
      deploymentMethod: LEGACY_GENERATIVE_DEPLOYMENT_METHOD_KEY,
    });

    expect(renderResult.result.current.data.extraOptions).toEqual([templateBackedOption]);
    expect(renderResult.result.current.data.suggestion).toBeUndefined();
  });
});

describe('KServeServingRuntimeFieldWizardField', () => {
  it('should use the externalDataHook for template loading', () => {
    expect(KServeServingRuntimeFieldWizardField.externalDataHook).toBe(
      useKServeServingRuntimeExternalData,
    );
  });

  it('should use modelServer stateKey and modelDeployment step', () => {
    expect(KServeServingRuntimeFieldWizardField.stateKey).toBe('modelServer');
    expect(KServeServingRuntimeFieldWizardField.step).toBe('modelDeployment');
    expect(KServeServingRuntimeFieldWizardField.id).toBe('kserve/modelServer');
  });

  it('should hydrate edit selections via getInitialFieldData', () => {
    expect(KServeServingRuntimeFieldWizardField.reducerFunctions.getInitialFieldData).toBe(
      resolveInitialModelServerFieldData,
    );
  });
});
