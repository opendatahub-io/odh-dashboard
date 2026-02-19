import { testHook } from '@odh-dashboard/jest-config/hooks';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { stringify } from 'yaml';
import type { WizardFormData } from '../types';
import type { Deployment } from '../../../../extension-points';
import {
  type DeploymentWizardResources,
  useFormToResourcesTransformer,
} from '../yaml/useFormToResourcesTransformer';
import { useFormYamlResources } from '../yaml/useYamlResourcesResult';

jest.mock('../useDeployMethod');
jest.mock('../useWizardFieldApply');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useDeployMethod } = require('../useDeployMethod') as {
  useDeployMethod: jest.Mock;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useWizardFieldApply } = require('../useWizardFieldApply') as {
  useWizardFieldApply: jest.Mock;
};

const mockModel: K8sResourceCommon = {
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

const mockFormData: WizardFormData = {
  state: {} as WizardFormData['state'],
};

describe('useFormYamlResources', () => {
  it('should return undefined yaml when formResources is undefined', () => {
    const renderResult = testHook(useFormYamlResources)(undefined);
    expect(renderResult).hookToStrictEqual({ yaml: undefined });
  });

  it('should return undefined yaml when formResources is an empty object', () => {
    const renderResult = testHook(useFormYamlResources)({});
    expect(renderResult).hookToStrictEqual({ yaml: undefined });
  });

  it('should return yaml string when formResources has a model', () => {
    const resources: DeploymentWizardResources = { model: mockModel };
    const renderResult = testHook(useFormYamlResources)(resources);
    expect(renderResult).hookToStrictEqual({ yaml: stringify(mockModel) });
  });

  it('should return stable value on rerender with same input', () => {
    const resources: DeploymentWizardResources = { model: mockModel };
    const renderResult = testHook(useFormYamlResources)(resources);

    renderResult.rerender(resources);
    expect(renderResult).hookToBeStable();
  });

  it('should update yaml when resources change', () => {
    const resources: DeploymentWizardResources = { model: mockModel };
    const renderResult = testHook(useFormYamlResources)(resources);

    const updatedModel: K8sResourceCommon = {
      ...mockModel,
      metadata: { ...mockModel.metadata, name: 'updated-model' },
    };
    const updatedResources: DeploymentWizardResources = { model: updatedModel };
    renderResult.rerender(updatedResources);

    expect(renderResult).hookToStrictEqual({ yaml: stringify(updatedModel) });
  });
});

describe('useFormToResourcesTransformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined resources when assembleDeployment is not available', () => {
    useDeployMethod.mockReturnValue({
      deployMethod: undefined,
      deployMethodLoaded: true,
      deployMethodErrors: [],
    });
    useWizardFieldApply.mockReturnValue({
      applyFieldData: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(renderResult).hookToStrictEqual({
      resources: undefined,
      loaded: true,
      errors: [],
    });
  });

  it('should return loaded false when deploy method is not loaded', () => {
    useDeployMethod.mockReturnValue({
      deployMethod: undefined,
      deployMethodLoaded: false,
      deployMethodErrors: [],
    });
    useWizardFieldApply.mockReturnValue({
      applyFieldData: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should return loaded false when apply extensions are not loaded', () => {
    useDeployMethod.mockReturnValue({
      deployMethod: undefined,
      deployMethodLoaded: true,
      deployMethodErrors: [],
    });
    useWizardFieldApply.mockReturnValue({
      applyFieldData: (d: Deployment) => d,
      applyExtensionsLoaded: false,
      applyExtensionErrors: [],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should combine errors from deploy method and apply extensions', () => {
    const deployError = new Error('deploy error');
    const applyError = new Error('apply error');

    useDeployMethod.mockReturnValue({
      deployMethod: undefined,
      deployMethodLoaded: true,
      deployMethodErrors: [deployError],
    });
    useWizardFieldApply.mockReturnValue({
      applyFieldData: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [applyError],
    });

    const renderResult = testHook(useFormToResourcesTransformer)(mockFormData);

    expect(renderResult.result.current.errors).toEqual([deployError, applyError]);
  });

  it('should assemble and apply field data when assembleDeployment is available', () => {
    const mockAssembleDeployment = jest.fn().mockReturnValue(mockDeployment);
    const mockApplyFieldData = jest.fn((d: Deployment) => d);

    useDeployMethod.mockReturnValue({
      deployMethod: {
        properties: {
          assembleDeployment: mockAssembleDeployment,
        },
      },
      deployMethodLoaded: true,
      deployMethodErrors: [],
    });
    useWizardFieldApply.mockReturnValue({
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

    useDeployMethod.mockReturnValue({
      deployMethod: {
        properties: {
          assembleDeployment: mockAssembleDeployment,
        },
      },
      deployMethodLoaded: true,
      deployMethodErrors: [],
    });
    useWizardFieldApply.mockReturnValue({
      applyFieldData: (d: Deployment) => d,
      applyExtensionsLoaded: true,
      applyExtensionErrors: [],
    });

    testHook(useFormToResourcesTransformer)(mockFormData, existingDeployment);

    expect(mockAssembleDeployment).toHaveBeenCalledWith(mockFormData, existingDeployment);
  });
});
