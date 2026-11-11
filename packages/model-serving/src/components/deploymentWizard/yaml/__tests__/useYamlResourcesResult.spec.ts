import { act } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { stringify } from 'yaml';
import type { WizardFormData } from '../../../../shared/types/form-data';
import type { Deployment, ModelResourceType } from '../../../../../extension-points';
import { DeploymentAssemblyResources } from '../../../../../extension-points/deployment-wizard';
import { useFormToResourcesTransformer } from '../useFormToResourcesTransformer';
import { useFormYamlResources } from '../useYamlResourcesResult';
import { useWizardFieldApply } from '../../useWizardFieldApply';
import { useExtractFormDataFromDeployment } from '../../useExtractFormDataFromDeployment';
import { mockExtensions, mockDeploymentWizardState } from '../../../../__tests__/mockUtils';

jest.mock('@odh-dashboard/plugin-core');
jest.mock('../../useWizardFieldApply');
jest.mock('../../useExtractFormDataFromDeployment');

const mockUseWizardFieldApply = jest.mocked(useWizardFieldApply);
const mockUseExtractFormDataFromDeployment = jest.mocked(useExtractFormDataFromDeployment);

const mockModel: ModelResourceType = {
  apiVersion: 'serving.kserve.io/v1alpha2',
  kind: 'LLMInferenceService',
  metadata: {
    name: 'test-model',
    namespace: 'test-ns',
  },
  spec: { model: { uri: 'hf://test/model' } },
};

const mockDeployment: Deployment = {
  modelServingPlatformId: 'test-platform',
  model: mockModel,
};

const mockFormData: WizardFormData = mockDeploymentWizardState();

describe('useFormYamlResources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExtractFormDataFromDeployment.mockReturnValue({
      formData: undefined,
      loaded: true,
      errors: [],
    });
  });

  it('should initialize yaml and resources from the existing deployment', () => {
    const renderResult = testHook(useFormYamlResources)(mockDeployment);
    expect(renderResult.result.current.yaml).toEqual({ yaml: stringify(mockModel) });
    expect(renderResult.result.current.resources.resources).toEqual({ model: mockModel });
  });

  it('should start with no model when there is no existing deployment', () => {
    const renderResult = testHook(useFormYamlResources)();
    expect(renderResult.result.current.yaml?.yaml).toBeFalsy();
    expect(renderResult.result.current.resources.resources.model).toBeUndefined();
  });

  it('should remove managedFields from form-derived YAML', () => {
    const renderResult = testHook(useFormYamlResources)();
    act(() => {
      renderResult.result.current.reinitYamlFromResources({
        model: {
          ...mockModel,
          metadata: { ...mockModel.metadata, managedFields: [{ manager: 'kubectl' }] },
        },
      });
    });

    expect(renderResult.result.current.yaml).toEqual({ yaml: stringify(mockModel) });
  });

  it('should remove managedFields from the initial editor YAML', () => {
    const renderResult = testHook(useFormYamlResources)({
      ...mockDeployment,
      model: {
        ...mockModel,
        metadata: { ...mockModel.metadata, managedFields: [{ manager: 'kubectl' }] },
      },
    });

    expect(renderResult.result.current.yaml).toEqual({ yaml: stringify(mockModel) });
  });

  it('should return yaml-parsed resources after setYaml is called', () => {
    const renderResult = testHook(useFormYamlResources)(mockDeployment);
    const editedModel = { ...mockModel, metadata: { ...mockModel.metadata, name: 'edited' } };
    act(() => {
      renderResult.result.current.setYaml({ yaml: stringify(editedModel) });
    });

    expect(renderResult.result.current.resources.resources).toStrictEqual({ model: editedModel });
  });

  it('should preserve the form server for submission and extraction after editing yaml', () => {
    const server: DeploymentAssemblyResources['server'] = {
      apiVersion: 'serving.kserve.io/v1alpha2',
      kind: 'LLMInferenceServiceConfig',
      metadata: { name: 'test-server', namespace: 'test-ns' },
    };
    const renderResult = testHook(useFormYamlResources)();
    act(() => {
      renderResult.result.current.reinitYamlFromResources({ model: mockModel, server });
    });
    const editedModel = { ...mockModel, metadata: { ...mockModel.metadata, name: 'edited' } };
    act(() => {
      renderResult.result.current.setYaml({ yaml: stringify(editedModel) });
    });

    expect(renderResult.result.current.resources.resources).toStrictEqual({
      model: editedModel,
      server,
    });
    expect(mockUseExtractFormDataFromDeployment).toHaveBeenLastCalledWith({
      modelServingPlatformId: 'llmd-serving',
      model: editedModel,
      server,
    });
  });

  it('should preserve the existing server when initially opening a deployment in yaml', () => {
    const server: DeploymentAssemblyResources['server'] = {
      apiVersion: 'serving.kserve.io/v1alpha2',
      kind: 'LLMInferenceServiceConfig',
      metadata: { name: 'existing-server', namespace: 'test-ns' },
    };
    const renderResult = testHook(useFormYamlResources)({ ...mockDeployment, server });
    expect(renderResult.result.current.resources.resources.server).toBe(server);
  });

  it('should replace and clear the server on reinitialization even when model yaml is unchanged', () => {
    const server: DeploymentAssemblyResources['server'] = {
      apiVersion: 'serving.kserve.io/v1alpha2',
      kind: 'LLMInferenceServiceConfig',
      metadata: { name: 'first-server', namespace: 'test-ns' },
    };
    const renderResult = testHook(useFormYamlResources)({ ...mockDeployment, server });
    const replacement = { ...server, metadata: { ...server.metadata, name: 'second-server' } };
    act(() => {
      renderResult.result.current.reinitYamlFromResources({
        model: mockModel,
        server: replacement,
      });
    });
    expect(renderResult.result.current.resources.resources.server).toBe(replacement);

    act(() => {
      renderResult.result.current.reinitYamlFromResources({ model: mockModel });
    });
    expect(renderResult.result.current.resources.resources).toStrictEqual({ model: mockModel });
  });

  it('should keep parse errors without restoring the saved model when yaml is invalid', () => {
    const server: DeploymentAssemblyResources['server'] = {
      apiVersion: 'serving.kserve.io/v1alpha2',
      kind: 'LLMInferenceServiceConfig',
      metadata: { name: 'test-server', namespace: 'test-ns' },
    };
    const renderResult = testHook(useFormYamlResources)({ ...mockDeployment, server });
    act(() => {
      renderResult.result.current.setYaml({ yaml: 'invalid: yaml:' });
    });

    expect(renderResult.result.current.resources.resources).toStrictEqual({
      model: undefined,
      server,
    });
    expect(renderResult.result.current.resources.error).toBeInstanceOf(Error);
    expect(renderResult.result.current.yamlSubmitErrors).toEqual([
      renderResult.result.current.resources.error,
    ]);
    expect(mockUseExtractFormDataFromDeployment).toHaveBeenLastCalledWith(null);
  });

  it('should return a stable value on rerender with the same input', () => {
    const renderResult = testHook(useFormYamlResources)(mockDeployment);
    renderResult.rerender(mockDeployment);
    expect(renderResult).hookToBeStable();
  });

  it('should update yaml and resources when explicitly reinitialized from the form', () => {
    const renderResult = testHook(useFormYamlResources)(mockDeployment);
    const updatedModel = {
      ...mockModel,
      metadata: { ...mockModel.metadata, name: 'updated-model' },
    };
    act(() => {
      renderResult.result.current.reinitYamlFromResources({ model: updatedModel });
    });

    expect(renderResult.result.current.yaml).toEqual({ yaml: stringify(updatedModel) });
    expect(renderResult.result.current.resources.resources).toEqual({ model: updatedModel });
  });

  it('should not replace edited yaml when the initial deployment prop changes', () => {
    const renderResult = testHook(useFormYamlResources)(mockDeployment);
    const customYaml = stringify({
      ...mockModel,
      metadata: { ...mockModel.metadata, name: 'custom' },
    });
    act(() => {
      renderResult.result.current.setYaml({ yaml: customYaml });
    });
    renderResult.rerender({
      ...mockDeployment,
      model: { ...mockModel, metadata: { ...mockModel.metadata, name: 'updated-model' } },
    });

    expect(renderResult.result.current.yaml).toEqual({ yaml: customYaml });
  });
});

describe('useFormToResourcesTransformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty resources when no assemble extension is available', () => {
    mockExtensions([]);
    mockUseWizardFieldApply.mockReturnValue({
      applyAllFieldDataFn: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(renderResult).hookToStrictEqual({
      resources: {},
      setLatestResourcesFromYaml: expect.any(Function),
      loaded: true,
      errors: [],
    });
  });

  it('should return loaded false when assemble extensions are not loaded', () => {
    const { mockUseResolvedExtensions } = mockExtensions([]);
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);
    mockUseWizardFieldApply.mockReturnValue({
      applyAllFieldDataFn: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should return loaded false when apply extensions are not loaded', () => {
    mockExtensions([]);
    mockUseWizardFieldApply.mockReturnValue({
      applyAllFieldDataFn: (d: Deployment) => d,
      applyExtensionsLoaded: false,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should combine errors from assemble extensions and apply extensions', () => {
    const assembleError = new Error('assemble error');
    const applyError = new Error('apply error');

    const { mockUseResolvedExtensions } = mockExtensions([]);
    mockUseResolvedExtensions.mockReturnValue([[], true, [assembleError]]);
    mockUseWizardFieldApply.mockReturnValue({
      applyAllFieldDataFn: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [applyError],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(renderResult.result.current.errors).toEqual([assembleError, applyError]);
  });

  it('should assemble and apply field data when assemble extension is available', () => {
    const mockAssembleDeployment = jest.fn().mockReturnValue(mockDeployment);
    const mockApplyFieldData = jest.fn((d: Deployment) => d);

    mockExtensions([
      {
        type: 'model-serving.deployment/assemble-model-resource',
        pluginName: 'test',
        uid: 'test-uid',
        properties: {
          platform: 'test-platform',
          isActive: true,
          assemble: mockAssembleDeployment,
        },
      },
    ]);
    mockUseWizardFieldApply.mockReturnValue({
      applyAllFieldDataFn: mockApplyFieldData,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(mockAssembleDeployment).toHaveBeenCalledWith(mockFormData, undefined, undefined, '');
    expect(mockApplyFieldData).toHaveBeenCalledWith(mockDeployment);
    expect(renderResult).hookToStrictEqual({
      resources: {
        model: mockDeployment.model,
      },
      setLatestResourcesFromYaml: expect.any(Function),
      loaded: true,
      errors: [],
    });
  });

  it('should pass navSourceMetadata to useWizardFieldApply when initialData has metadata', () => {
    const navSourceMetadata = {
      labels: {
        'modelregistry.opendatahub.io/registered-model-id': '123',
        'modelregistry.opendatahub.io/model-version-id': '456',
        'modelregistry.opendatahub.io/name': 'test-registry',
      },
      annotations: {
        'some-annotation-key': 'some-annotation-value',
      },
    };

    const formDataWithMetadata: WizardFormData = {
      ...mockDeploymentWizardState(),
      initialData: { navSourceMetadata },
    };

    const deploymentWithMetadata: Deployment = {
      ...mockDeployment,
      model: {
        ...mockDeployment.model,
        metadata: {
          ...mockDeployment.model.metadata,
          labels: navSourceMetadata.labels,
          annotations: navSourceMetadata.annotations,
        },
      },
    };

    const mockAssembleDeployment = jest.fn().mockReturnValue(mockDeployment);
    const mockApplyFieldData = jest.fn().mockReturnValue(deploymentWithMetadata);

    mockExtensions([
      {
        type: 'model-serving.deployment/assemble-model-resource',
        pluginName: 'test',
        uid: 'test-uid',
        properties: {
          platform: 'test-platform',
          isActive: true,
          assemble: mockAssembleDeployment,
        },
      },
    ]);
    mockUseWizardFieldApply.mockReturnValue({
      applyAllFieldDataFn: mockApplyFieldData,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(formDataWithMetadata);

    expect(mockUseWizardFieldApply).toHaveBeenCalledWith(
      formDataWithMetadata.state,
      navSourceMetadata,
    );
    expect(renderResult).hookToStrictEqual({
      resources: { model: deploymentWithMetadata.model },
      setLatestResourcesFromYaml: expect.any(Function),
      loaded: true,
      errors: [],
    });
  });

  it('should pass undefined navSourceMetadata when initialData has no metadata', () => {
    const formDataNoMetadata: WizardFormData = {
      ...mockDeploymentWizardState(),
      initialData: {},
    };

    mockExtensions([]);
    mockUseWizardFieldApply.mockReturnValue({
      applyAllFieldDataFn: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    testHook(useFormToResourcesTransformer)(formDataNoMetadata);

    expect(mockUseWizardFieldApply).toHaveBeenCalledWith(formDataNoMetadata.state, undefined);
  });

  it('should pass existingDeployment to assembleDeployment', () => {
    const existingDeployment: Deployment = {
      ...mockDeployment,
      model: {
        ...mockDeployment.model,
        metadata: {
          ...mockDeployment.model.metadata,
          name: 'existing-model',
        },
      },
    };
    const mockAssembleDeployment = jest.fn().mockReturnValue(mockDeployment);

    mockExtensions([
      {
        type: 'model-serving.deployment/assemble-model-resource',
        pluginName: 'test',
        uid: 'test-uid',
        properties: {
          platform: 'test-platform',
          isActive: true,
          assemble: mockAssembleDeployment,
        },
      },
    ]);
    mockUseWizardFieldApply.mockReturnValue({
      applyAllFieldDataFn: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    testHook(useFormToResourcesTransformer)(mockFormData, existingDeployment);

    expect(mockAssembleDeployment).toHaveBeenCalledWith(
      mockFormData,
      existingDeployment,
      undefined,
      '',
    );
  });

  it('should keep the existing server when applying resources from YAML', () => {
    const server: DeploymentAssemblyResources['server'] = {
      apiVersion: 'serving.kserve.io/v1alpha2',
      kind: 'LLMInferenceServiceConfig',
      metadata: { name: 'existing-server', namespace: 'test-ns' },
    };
    const existingDeployment: Deployment = { ...mockDeployment, server };
    const yamlModel: ModelResourceType = {
      ...mockModel,
      metadata: { ...mockModel.metadata, name: 'from-yaml' },
    };
    const yamlServer: DeploymentAssemblyResources['server'] = {
      apiVersion: 'serving.kserve.io/v1alpha2',
      kind: 'LLMInferenceServiceConfig',
      metadata: { name: 'yaml-server', namespace: 'test-ns' },
    };
    const mockAssembleDeployment = jest.fn().mockReturnValue(mockDeployment);

    mockExtensions([
      {
        type: 'model-serving.deployment/assemble-model-resource',
        pluginName: 'test',
        uid: 'test-uid',
        properties: {
          platform: 'test-platform',
          isActive: true,
          assemble: mockAssembleDeployment,
        },
      },
    ]);
    mockUseWizardFieldApply.mockReturnValue({
      applyAllFieldDataFn: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData, existingDeployment);
    act(() => {
      renderResult.result.current.setLatestResourcesFromYaml({
        model: yamlModel,
        server: yamlServer,
      });
    });

    // YAML only owns the model; the existing server must not be replaced or dropped
    expect(mockAssembleDeployment).toHaveBeenLastCalledWith(
      mockFormData,
      { ...existingDeployment, model: yamlModel },
      undefined,
      '',
    );
  });
});
