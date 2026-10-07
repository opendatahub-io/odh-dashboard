import { ServingRuntimeModelType } from '@odh-dashboard/model-serving/shared';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import * as projectSelectors from '@odh-dashboard/internal/redux/selectors/project';
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

jest.mock('@odh-dashboard/internal/redux/selectors/project');
jest.mock('@odh-dashboard/model-serving/concepts/useServingRuntimeTemplates');
jest.mock('@odh-dashboard/model-serving/concepts/useModelServingClusterSettings');
jest.mock('@odh-dashboard/model-serving/shared/wizard-fields', () => {
  const actual = jest.requireActual('@odh-dashboard/model-serving/shared/wizard-fields');
  return {
    ...actual,
    useWizardFieldOverrides: jest.fn(() => []),
  };
});

const mockUseDashboardNamespace = jest.mocked(projectSelectors.useDashboardNamespace);
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

    expect(mockUseServingRuntimeTemplates).toHaveBeenCalledWith(undefined, false);
    expect(mockUseServingRuntimeTemplates).toHaveBeenCalledWith(undefined, false);
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

    expect(mockUseServingRuntimeTemplates).toHaveBeenCalledWith(undefined, true);
    expect(mockUseServingRuntimeTemplates).toHaveBeenCalledWith(undefined, false);
    expect(renderResult.result.current.data.templates).toEqual([template]);
    expect(renderResult.result.current.loaded).toBe(true);
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
