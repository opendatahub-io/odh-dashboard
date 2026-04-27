import {
  getInferenceServiceSizeOrReturnEmpty,
  getServingRuntimeOrReturnEmpty,
  getKServeContainer,
  getKServeContainerArgs,
  getKServeContainerEnvVarStrs,
  resourcesArePositive,
  setUpTokenAuth,
  isOciModelUri,
  getInferenceServiceStoppedStatus,
  getServingRuntimeVersionStatus,
  getModelServingPVCAnnotations,
  isModelServerEditInfoChanged,
} from '#~/pages/modelServing/utils';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { ContainerResources } from '#~/types';
import { mockServiceAccountK8sResource } from '#~/__mocks__/mockServiceAccountK8sResource';
import { mockRoleBindingK8sResource } from '#~/__mocks__/mockRoleBindingK8sResource';
import {
  createRole,
  createRoleBinding,
  createSecret,
  createServiceAccount,
  getRole,
  getRoleBinding,
  getServiceAccount,
} from '#~/api';
import { mock404Error } from '#~/__mocks__/mockK8sStatus';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockRoleK8sResource } from '#~/__mocks__/mockRoleK8sResource';
import { ServingRuntimeVersionStatusLabel } from '#~/pages/modelServing/screens/const';
import { ServingRuntimeKind } from '#~/k8sTypes';
import {
  CreatingServingRuntimeObject,
  ServingRuntimeEditInfo,
} from '#~/pages/modelServing/screens/types';
import { ModelServingPodSpecOptionsState } from '#~/concepts/hardwareProfiles/deprecated/useModelServingAcceleratorDeprecatedPodSpecOptionsState';

jest.mock('#~/api', () => ({
  ...jest.requireActual('#~/api'),
  getServiceAccount: jest.fn(),
  createServiceAccount: jest.fn(),
  getRoleBinding: jest.fn(),
  createRoleBinding: jest.fn(),
  getRole: jest.fn(),
  createRole: jest.fn(),
  createSecret: jest.fn(),
}));

describe('resourcesArePositive', () => {
  it('should return true for undefined limits and request', () => {
    const resources: ContainerResources = {
      limits: undefined,
      requests: undefined,
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });

  it('should return false for resources with zero limits and requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: 0, memory: '0Gi' },
      requests: { cpu: 0, memory: '0Gi' },
    };
    expect(resourcesArePositive(resources)).toBe(false);
  });

  it('should return false for resources with negative limits and requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: '-1', memory: '-1Mi' },
      requests: { cpu: '-1', memory: '-1Mi' },
    };
    expect(resourcesArePositive(resources)).toBe(false);
  });

  it('should return true for resources with positive limits and requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: '1', memory: '1Gi' },
      requests: { cpu: '1', memory: '1Gi' },
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });

  it('should return true for resources with positive limits and undefined requests', () => {
    const resources: ContainerResources = {
      limits: { cpu: 1, memory: '1Gi' },
      requests: undefined,
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });

  it('should return true for resources with undefined limits and positive requests', () => {
    const resources: ContainerResources = {
      limits: undefined,
      requests: { cpu: 1, memory: '1Gi' },
    };
    expect(resourcesArePositive(resources)).toBe(true);
  });
});

describe('setUpTokenAuth', () => {
  const setMockImplementations = (
    serviceAccountAndRoleBindingAlreadyExist = false,
    dryRun = false,
  ) => {
    if (serviceAccountAndRoleBindingAlreadyExist) {
      jest
        .mocked(getServiceAccount)
        .mockImplementation((name: string, namespace: string) =>
          Promise.resolve(mockServiceAccountK8sResource({ name, namespace })),
        );
      jest
        .mocked(getRole)
        .mockImplementation((namespace: string, name: string) =>
          Promise.resolve(mockRoleK8sResource({ name, namespace })),
        );
      jest
        .mocked(getRoleBinding)
        .mockImplementation((namespace: string, name: string) =>
          Promise.resolve(mockRoleBindingK8sResource({ name, namespace })),
        );
      jest
        .mocked(createRoleBinding)
        .mockImplementation(() => Promise.resolve(mockRoleBindingK8sResource({})));
    } else {
      jest
        .mocked(getServiceAccount)
        .mockImplementation(() => Promise.reject({ statusObject: mock404Error({}) }));
      jest
        .mocked(getRole)
        .mockImplementation(() => Promise.reject({ statusObject: mock404Error({}) }));
      jest
        .mocked(getRoleBinding)
        .mockImplementation(() => Promise.reject({ statusObject: mock404Error({}) }));
      jest
        .mocked(createRoleBinding)
        .mockImplementation(() =>
          dryRun
            ? Promise.reject({ statusObject: mock404Error({}) })
            : Promise.resolve(mockRoleBindingK8sResource({})),
        );
    }
  };

  const fillData: Parameters<typeof setUpTokenAuth>[0] = {
    name: 'test-name-sa',
    k8sName: 'test-name-sa',
    servingRuntimeTemplateName: '',
    numReplicas: 1,
    externalRoute: false,
    tokenAuth: false,
    tokens: [{ uuid: '', name: 'default-name', error: '' }],
  };

  describe('for kserve', () => {
    it('should create service account, role, role binding and secrets if createTokenAuth is true', async () => {
      setMockImplementations(false);
      await setUpTokenAuth(
        { ...fillData, tokenAuth: true },
        'test-name',
        'test-project',
        true,
        mockServingRuntimeK8sResource({ name: 'test-name-sa', namespace: 'test-project' }),
      );
      expect(createServiceAccount).toHaveBeenCalled();
      expect(createRole).toHaveBeenCalled();
      expect(createRoleBinding).toHaveBeenCalled();
      expect(createSecret).toHaveBeenCalled();
    });

    it('should create service account, role, role binding and secrets if createTokenAuth is true, it should not fail in dryRun mode', async () => {
      const dryRun = true;
      setMockImplementations(false, dryRun);
      await setUpTokenAuth(
        { ...fillData, tokenAuth: true },
        'test-name',
        'test-project',
        true,
        mockServingRuntimeK8sResource({ name: 'test-name-sa', namespace: 'test-project' }),
        [],
        { dryRun },
      );
      expect(createServiceAccount).toHaveBeenCalled();
      expect(createRole).toHaveBeenCalled();
      expect(createRoleBinding).toHaveBeenCalled();
      expect(createSecret).toHaveBeenCalled();
    });

    it('should not create service account and role binding if they already exist', async () => {
      setMockImplementations(true);
      await setUpTokenAuth(
        { ...fillData, tokenAuth: true },
        'test-name',
        'test-project',
        true,
        mockServingRuntimeK8sResource({ name: 'test-name-sa', namespace: 'test-project' }),
      );
      expect(createServiceAccount).not.toHaveBeenCalled();
      expect(createRole).not.toHaveBeenCalled();
      expect(createRoleBinding).not.toHaveBeenCalled();
      expect(createSecret).toHaveBeenCalled();
    });

    it('should not create service account and role binding if createTokenAuth is false', async () => {
      setMockImplementations(false);
      await setUpTokenAuth(
        { ...fillData, tokenAuth: false },
        'test-name',
        'test-project',
        false,
        mockServingRuntimeK8sResource({ name: 'test-name-sa', namespace: 'test-project' }),
      );
      expect(createServiceAccount).not.toHaveBeenCalled();
      expect(createRole).not.toHaveBeenCalled();
      expect(createRoleBinding).not.toHaveBeenCalled();
      expect(createSecret).toHaveBeenCalled();
    });
  });
});

describe('getInferenceServiceSizeOrReturnEmpty', () => {
  it('should return undefined if Inference Service is undefined', () => {
    const inferenceService = undefined;
    expect(getInferenceServiceSizeOrReturnEmpty(inferenceService)).toBeUndefined();
  });

  it('should return undefined if resources attribute is empty', () => {
    const inferenceService = mockInferenceServiceK8sResource({ resources: {} });
    expect(getInferenceServiceSizeOrReturnEmpty(inferenceService)).toBeUndefined();
  });

  it('should return the right size', () => {
    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '1', memory: '1Gi' },
    };
    const inferenceService = mockInferenceServiceK8sResource({ resources });
    expect(getInferenceServiceSizeOrReturnEmpty(inferenceService)).toBe(resources);
  });
});

describe('getServingRuntimeSizeOrReturnEmpty', () => {
  it('should return undefined if ServingRuntime is undefined', () => {
    const servingRuntime = undefined;
    expect(getServingRuntimeOrReturnEmpty(servingRuntime)).toBeUndefined();
  });

  it('should return undefined if resources attribute is empty', () => {
    const servingRuntime = mockServingRuntimeK8sResource({ resources: {} });
    expect(getServingRuntimeOrReturnEmpty(servingRuntime)).toBeUndefined();
  });

  it('should return the right size', () => {
    const resources = {
      requests: { cpu: '1', memory: '1Gi' },
      limits: { cpu: '1', memory: '1Gi' },
    };
    const servingRuntime = mockServingRuntimeK8sResource({ resources });
    expect(getServingRuntimeOrReturnEmpty(servingRuntime)).toBe(resources);
  });
});

describe('isOciModelUri', () => {
  it('returns true for oci:// URIs', () => {
    expect(isOciModelUri('oci://my-model')).toBe(true);
  });
  it('returns false for non-oci URIs', () => {
    expect(isOciModelUri('s3://my-model')).toBe(false);
    expect(isOciModelUri(undefined)).toBe(false);
    expect(isOciModelUri('')).toBe(false);
  });
});

describe('getInferenceServiceStoppedStatus', () => {
  it('should return running status when model is running', () => {
    const inferenceService = mockInferenceServiceK8sResource({});

    expect(getInferenceServiceStoppedStatus(inferenceService)).toEqual({
      inferenceService,
      isStopped: false,
      isRunning: true,
    });
  });

  it('should return stopped status when model is stopped', () => {
    const inferenceService = mockInferenceServiceK8sResource({});
    inferenceService.metadata.annotations ??= {};
    inferenceService.metadata.annotations['serving.kserve.io/stop'] = 'true';

    expect(getInferenceServiceStoppedStatus(inferenceService)).toEqual({
      inferenceService,
      isStopped: true,
      isRunning: false,
    });
  });
});

describe('getServingRuntimeVersionStatus', () => {
  it('should return undefined if servingRuntimeVersion or templateVersion is undefined', () => {
    expect(getServingRuntimeVersionStatus(undefined, undefined)).toBeUndefined();
  });

  it('should return latest if servingRuntimeVersion and templateVersion are the same', () => {
    expect(getServingRuntimeVersionStatus('1.0.0', '1.0.0')).toBe(
      ServingRuntimeVersionStatusLabel.LATEST,
    );
  });

  it('should return outdated if servingRuntimeVersion and templateVersion are different', () => {
    expect(getServingRuntimeVersionStatus('1.0.0', '2.0.0')).toBe(
      ServingRuntimeVersionStatusLabel.OUTDATED,
    );
  });
});

describe('getModelServingPVCAnnotations', () => {
  it('should return the right annotations', () => {
    const pvc = mockPVCK8sResource({
      annotations: {
        'dashboard.opendatahub.io/model-name': 'test-model',
        'dashboard.opendatahub.io/model-path': 'test-path',
      },
    });
    expect(getModelServingPVCAnnotations(pvc)).toEqual({
      modelName: 'test-model',
      modelPath: 'test-path',
    });
  });

  it('should return null if annotations are not present', () => {
    const pvc = mockPVCK8sResource({});
    expect(getModelServingPVCAnnotations(pvc)).toEqual({
      modelName: null,
      modelPath: null,
    });
  });
});

describe('spec-less ServingRuntime handling', () => {
  const speclessRuntime = {
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'ServingRuntime',
    metadata: { name: 'no-spec', namespace: 'test' },
  } as unknown as ServingRuntimeKind;

  const emptyContainersRuntime = {
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'ServingRuntime',
    metadata: { name: 'empty-containers', namespace: 'test' },
    spec: { containers: [] },
  } as unknown as ServingRuntimeKind;

  describe('getServingRuntimeOrReturnEmpty', () => {
    it('should return undefined for a spec-less serving runtime', () => {
      expect(getServingRuntimeOrReturnEmpty(speclessRuntime)).toBeUndefined();
    });

    it('should return undefined for a serving runtime with empty containers', () => {
      expect(getServingRuntimeOrReturnEmpty(emptyContainersRuntime)).toBeUndefined();
    });
  });

  describe('getKServeContainer', () => {
    it('should return undefined for a spec-less serving runtime', () => {
      expect(getKServeContainer(speclessRuntime)).toBeUndefined();
    });

    it('should return undefined for a serving runtime with empty containers', () => {
      expect(getKServeContainer(emptyContainersRuntime)).toBeUndefined();
    });
  });

  describe('getKServeContainerArgs', () => {
    it('should return undefined for a spec-less serving runtime', () => {
      expect(getKServeContainerArgs(speclessRuntime)).toBeUndefined();
    });
  });

  describe('getKServeContainerEnvVarStrs', () => {
    it('should return undefined for a spec-less serving runtime', () => {
      expect(getKServeContainerEnvVarStrs(speclessRuntime)).toBeUndefined();
    });
  });

  describe('isModelServerEditInfoChanged', () => {
    const createData: CreatingServingRuntimeObject = {
      name: 'test',
      k8sName: 'test',
      servingRuntimeTemplateName: 'ovms',
      numReplicas: 1,
      externalRoute: false,
      tokenAuth: false,
      tokens: [],
    };

    const podSpecOptionsState = {
      podSpecOptions: {
        resources: undefined,
        tolerations: undefined,
        nodeSelector: undefined,
      },
      modelSize: { size: undefined, sizes: [] },
    } as unknown as ModelServingPodSpecOptionsState;

    it('should not crash when editInfo contains a spec-less serving runtime', () => {
      const editInfo: ServingRuntimeEditInfo = {
        servingRuntime: speclessRuntime,
        secrets: [],
      };
      expect(() =>
        isModelServerEditInfoChanged(createData, podSpecOptionsState, editInfo),
      ).not.toThrow();
    });

    it('should return true when editInfo contains a spec-less serving runtime', () => {
      const editInfo: ServingRuntimeEditInfo = {
        servingRuntime: speclessRuntime,
        secrets: [],
      };
      expect(isModelServerEditInfoChanged(createData, podSpecOptionsState, editInfo)).toBe(true);
    });
  });
});
