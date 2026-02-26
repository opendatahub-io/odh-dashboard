import { act } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { stringify } from 'yaml';
import type { WizardFormData } from '../../types';
import type { Deployment, ModelResourceType } from '../../../../../extension-points';
import {
  type DeploymentWizardResources,
  useFormToResourcesTransformer,
} from '../useFormToResourcesTransformer';
import { useFormYamlResources } from '../useYamlResourcesResult';
import { useWizardFieldApply } from '../../useWizardFieldApply';
import { mockExtensions, mockDeploymentWizardState } from '../../../../__tests__/mockUtils';

jest.mock('@odh-dashboard/plugin-core');
jest.mock('../../useWizardFieldApply');

const mockUseWizardFieldApply = jest.mocked(useWizardFieldApply);

const mockModel: ModelResourceType = {
  apiVersion: 'serving.kserve.io/v1beta1',
  kind: 'InferenceService',
  metadata: {
    name: 'test-model',
    namespace: 'test-ns',
  },
};

const mockDeployment: Deployment = {
  modelServingPlatformId: 'test-platform',
  model: {
    apiVersion: 'serving.kserve.io/v1beta1',
    kind: 'InferenceService',
    metadata: {
      name: 'test-model',
      namespace: 'test-ns',
    },
  },
};

const mockFormData: WizardFormData = mockDeploymentWizardState();

describe('useFormYamlResources', () => {
  it('should return form-derived yaml string by default', () => {
    const resources: DeploymentWizardResources = { model: mockModel };
    const renderResult = testHook(useFormYamlResources)(resources);
    expect(renderResult.result.current.yaml).toBe(stringify(mockModel));
  });

  it('should return formResources as resources by default', () => {
    const resources: DeploymentWizardResources = { model: mockModel };
    const renderResult = testHook(useFormYamlResources)(resources);
    expect(renderResult.result.current.resources).toBe(resources);
  });

  it('should return yaml-parsed resources after setYaml is called', () => {
    const resources: DeploymentWizardResources = { model: mockModel };
    const renderResult = testHook(useFormYamlResources)(resources);

    const editedModel = { ...mockModel, metadata: { ...mockModel.metadata, name: 'edited' } };
    act(() => {
      renderResult.result.current.setYaml(stringify(editedModel));
    });

    expect(renderResult.result.current.resources).toStrictEqual({ model: editedModel });
    expect(renderResult.result.current.resources).not.toBe(resources);
  });

  it('should return editor yaml after setYaml is called', () => {
    const resources: DeploymentWizardResources = { model: mockModel };
    const renderResult = testHook(useFormYamlResources)(resources);

    const customYaml = 'kind: LLMInferenceService\nmetadata:\n  name: custom\n';
    act(() => {
      renderResult.result.current.setYaml(customYaml);
    });

    expect(renderResult.result.current.yaml).toBe(customYaml);
  });

  it('should provide setYaml function', () => {
    const resources: DeploymentWizardResources = { model: mockModel };
    const renderResult = testHook(useFormYamlResources)(resources);
    expect(renderResult.result.current.setYaml).toEqual(expect.any(Function));
  });

  it('should return stable value on rerender with same input', () => {
    const resources: DeploymentWizardResources = { model: mockModel };
    const renderResult = testHook(useFormYamlResources)(resources);
    renderResult.rerender(resources);
    expect(renderResult).hookToBeStable();
  });

  it('should update yaml when formResources change and editor has not been used', () => {
    const resources: DeploymentWizardResources = { model: mockModel };
    const renderResult = testHook(useFormYamlResources)(resources);

    const updatedModel: ModelResourceType = {
      ...mockModel,
      metadata: { ...mockModel.metadata, name: 'updated-model' },
    };
    const updatedResources: DeploymentWizardResources = { model: updatedModel };
    renderResult.rerender(updatedResources);

    expect(renderResult.result.current.yaml).toBe(stringify(updatedModel));
    expect(renderResult.result.current.resources).toBe(updatedResources);
  });

  it('should not revert to form yaml after setYaml has been called', () => {
    const resources: DeploymentWizardResources = { model: mockModel };
    const renderResult = testHook(useFormYamlResources)(resources);

    const customYaml = 'kind: LLMInferenceService\nmetadata:\n  name: custom\n';
    act(() => {
      renderResult.result.current.setYaml(customYaml);
    });

    const updatedModel: ModelResourceType = {
      ...mockModel,
      metadata: { ...mockModel.metadata, name: 'updated-model' },
    };
    renderResult.rerender({ model: updatedModel });

    expect(renderResult.result.current.yaml).toBe(customYaml);
  });
});

describe('useFormToResourcesTransformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty resources when no assemble extension is available', () => {
    mockExtensions([]);
    mockUseWizardFieldApply.mockReturnValue({
      applyFieldData: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(renderResult).hookToStrictEqual({
      resources: {},
      loaded: true,
      errors: [],
    });
  });

  it('should return loaded false when assemble extensions are not loaded', () => {
    const { mockUseResolvedExtensions } = mockExtensions([]);
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);
    mockUseWizardFieldApply.mockReturnValue({
      applyFieldData: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should return loaded false when apply extensions are not loaded', () => {
    mockExtensions([]);
    mockUseWizardFieldApply.mockReturnValue({
      applyFieldData: (d: Deployment) => d,
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
      applyFieldData: (d: Deployment) => d,
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
      applyFieldData: mockApplyFieldData,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(mockAssembleDeployment).toHaveBeenCalledWith(mockFormData, undefined);
    expect(mockApplyFieldData).toHaveBeenCalledWith(mockDeployment);
    expect(renderResult).hookToStrictEqual({
      resources: {
        model: mockDeployment.model,
      },
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
      applyFieldData: mockApplyFieldData,
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
      applyFieldData: (d: Deployment) => d,
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
      applyFieldData: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    testHook(useFormToResourcesTransformer)(mockFormData, existingDeployment);

    expect(mockAssembleDeployment).toHaveBeenCalledWith(mockFormData, existingDeployment);
  });
});
