import { resourcesArePositive, setUpTokenAuth } from '~/pages/modelServing/utils';
import {
  mockServingRuntimeK8sResource,
  mockServingRuntimeK8sResourceLegacy,
} from '~/__mocks__/mockServingRuntimeK8sResource';
import { ServingRuntimeKind } from '~/k8sTypes';
import {
  getDisplayNameFromServingRuntimeTemplate,
  getEnabledPlatformsFromTemplate,
  getTemplateEnabledForPlatform,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { ContainerResources, ServingRuntimePlatform } from '~/types';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockServiceAccountK8sResource } from '~/__mocks__/mockServiceAccountK8sResource';
import { mock404Error } from '~/__mocks__/mock404Error';
import { mockRoleBindingK8sResource } from '~/__mocks__/mockRoleBindingK8sResource';
import {
  createRoleBinding,
  createSecret,
  createServiceAccount,
  getRoleBinding,
  getServiceAccount,
} from '~/api';

jest.mock('~/api', () => ({
  ...jest.requireActual('~/api'),
  getServiceAccount: jest.fn(),
  createServiceAccount: jest.fn(),
  getRoleBinding: jest.fn(),
  createRoleBinding: jest.fn(),
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
  const setMockImplementations = (serviceAccountAndRoleBindingAlreadyExist = false) => {
    if (serviceAccountAndRoleBindingAlreadyExist) {
      jest
        .mocked(getServiceAccount)
        .mockImplementation((name: string, namespace: string) =>
          Promise.resolve(mockServiceAccountK8sResource({ name, namespace })),
        );
      jest
        .mocked(getRoleBinding)
        .mockImplementation((name: string, namespace: string) =>
          Promise.resolve(mockRoleBindingK8sResource({ name, namespace })),
        );
    } else {
      jest
        .mocked(getServiceAccount)
        .mockImplementation(() => Promise.reject({ statusObject: mock404Error({}) }));
      jest
        .mocked(getRoleBinding)
        .mockImplementation(() => Promise.reject({ statusObject: mock404Error({}) }));
    }
  };

  const fillData: Parameters<typeof setUpTokenAuth>[0] = {
    name: 'test-name-sa',
    servingRuntimeTemplateName: '',
    numReplicas: 1,
    modelSize: {
      name: '',
      resources: {
        requests: {},
        limits: {},
      },
    },
    externalRoute: false,
    tokenAuth: false,
    tokens: [{ uuid: '', name: 'default-name', error: '' }],
  };

  it('should create service account, role binding and secrets if createTokenAuth is true', async () => {
    setMockImplementations(false);
    await setUpTokenAuth(
      { ...fillData, tokenAuth: true },
      'test-name',
      'test-project',
      true,
      mockServingRuntimeK8sResource({ name: 'test-name-sa', namespace: 'test-project' }),
    );
    expect(createServiceAccount).toHaveBeenCalled();
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
    expect(createRoleBinding).not.toHaveBeenCalled();
    expect(createSecret).toHaveBeenCalled();
  });
});

describe('getDisplayNameFromServingRuntimeTemplate', () => {
  it('should provide default name if not found', () => {
    const servingRuntime = getDisplayNameFromServingRuntimeTemplate({
      metadata: {},
      spec: {},
    } as ServingRuntimeKind);
    expect(servingRuntime).toBe('Unknown Serving Runtime');
  });

  it('should prioritize name from annotation "opendatahub.io/template-display-name"', () => {
    const servingRuntime = getDisplayNameFromServingRuntimeTemplate(
      mockServingRuntimeK8sResource({}),
    );
    expect(servingRuntime).toBe('OpenVINO Serving Runtime (Supports GPUs)');
  });

  it('should fallback first to name from annotation "opendatahub.io/template-name"', () => {
    const mockServingRuntime = mockServingRuntimeK8sResource({});
    delete mockServingRuntime.metadata.annotations?.['opendatahub.io/template-display-name'];
    const servingRuntime = getDisplayNameFromServingRuntimeTemplate(mockServingRuntime);
    expect(servingRuntime).toBe('ovms');
  });

  it('should fallback to ovms serverType', () => {
    const servingRuntime = getDisplayNameFromServingRuntimeTemplate(
      mockServingRuntimeK8sResourceLegacy({}),
    );
    expect(servingRuntime).toBe('OpenVINO Model Server');
  });
});

describe('getTemplateEnabledForPlatform', () => {
  it('should be true if template supports both', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
    });
    expect(
      getTemplateEnabledForPlatform(teamplateAllPlatforms, ServingRuntimePlatform.SINGLE),
    ).toBeTruthy();
  });

  it('should be false if template supports MULTI but we pass SINGLE as check', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [ServingRuntimePlatform.MULTI],
    });
    expect(
      getTemplateEnabledForPlatform(teamplateAllPlatforms, ServingRuntimePlatform.SINGLE),
    ).toBeFalsy();
  });

  it('should be true if template supports SINGLE but we pass SINGLE as check', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [ServingRuntimePlatform.SINGLE],
    });
    expect(
      getTemplateEnabledForPlatform(teamplateAllPlatforms, ServingRuntimePlatform.SINGLE),
    ).toBeTruthy();
  });
});

describe('getEnabledPlatformsFromTemplate', () => {
  it('should return only MULTI if annotation is empty', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [],
    });
    expect(getEnabledPlatformsFromTemplate(teamplateAllPlatforms)).toEqual([
      ServingRuntimePlatform.MULTI,
    ]);
  });

  it('should return only MULTI if no annotation', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [],
    });

    delete teamplateAllPlatforms.metadata.annotations?.['opendatahub.io/modelServingSupport'];

    expect(getEnabledPlatformsFromTemplate(teamplateAllPlatforms)).toEqual([
      ServingRuntimePlatform.MULTI,
    ]);
  });

  it('should return only SINGLE', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [ServingRuntimePlatform.SINGLE],
    });
    expect(getEnabledPlatformsFromTemplate(teamplateAllPlatforms)).toEqual([
      ServingRuntimePlatform.SINGLE,
    ]);
  });

  it('should return both platforms', () => {
    const teamplateAllPlatforms = mockServingRuntimeTemplateK8sResource({
      platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
    });
    expect(getEnabledPlatformsFromTemplate(teamplateAllPlatforms)).toEqual([
      ServingRuntimePlatform.SINGLE,
      ServingRuntimePlatform.MULTI,
    ]);
  });
});
