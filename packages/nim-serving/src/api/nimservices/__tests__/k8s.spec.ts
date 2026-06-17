import {
  k8sCreateResource,
  k8sUpdateResource,
  k8sPatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/utils';
import type { HardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { KnownLabels } from '@odh-dashboard/k8s-core';
import { createNIMService, updateNIMService, patchNIMService, assembleNIMService } from '../k8s';
import { NIMServiceModel, type NIMServiceKind } from '../types';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sCreateResource: jest.fn(),
  k8sUpdateResource: jest.fn(),
  k8sPatchResource: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/apiMergeUtils', () => ({
  applyK8sAPIOptions: jest.fn((opts, apiOpts) => ({
    ...opts,
    ...(apiOpts?.dryRun && { queryOptions: { queryParams: { dryRun: 'All' } } }),
  })),
}));

jest.mock('@odh-dashboard/internal/api/k8sUtils', () => ({
  createPatchesFromDiff: jest.fn((a, b) => {
    if (JSON.stringify(a) === JSON.stringify(b)) {
      return [];
    }
    return [{ op: 'replace', path: '/spec/replicas', value: b.spec?.replicas }];
  }),
}));

jest.mock('@odh-dashboard/internal/concepts/hardwareProfiles/utils', () => ({
  applyHardwareProfileConfig: jest.fn((resource) => resource),
}));

const mockK8sCreate = jest.mocked(k8sCreateResource);
const mockK8sUpdate = jest.mocked(k8sUpdateResource);
const mockK8sPatch = jest.mocked(k8sPatchResource);
const mockApplyHardwareProfile = jest.mocked(applyHardwareProfileConfig);

const mockNIMService: NIMServiceKind = {
  apiVersion: 'apps.nvidia.com/v1alpha1',
  kind: 'NIMService',
  metadata: { name: 'test-nim', namespace: 'test-ns' },
  spec: {
    inferencePlatform: 'kserve',
    image: { repository: 'nvcr.io/nim/meta/llama-3.2-1b-instruct', tag: '1.8' },
  },
};

const emptyHardwareProfile: HardwareProfileConfig = {
  selectedProfile: undefined,
  useExistingSettings: false,
  resources: { requests: {}, limits: {} },
};

describe('createNIMService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should call k8sCreateResource with NIMServiceModel', async () => {
    mockK8sCreate.mockResolvedValue(mockNIMService);
    await createNIMService(mockNIMService);
    expect(mockK8sCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: NIMServiceModel, resource: mockNIMService }),
    );
  });

  it('should pass dryRun option', async () => {
    mockK8sCreate.mockResolvedValue(mockNIMService);
    await createNIMService(mockNIMService, { dryRun: true });
    expect(mockK8sCreate).toHaveBeenCalledWith(
      expect.objectContaining({ queryOptions: { queryParams: { dryRun: 'All' } } }),
    );
  });
});

describe('updateNIMService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should call k8sUpdateResource with NIMServiceModel', async () => {
    mockK8sUpdate.mockResolvedValue(mockNIMService);
    await updateNIMService(mockNIMService);
    expect(mockK8sUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ model: NIMServiceModel, resource: mockNIMService }),
    );
  });
});

describe('patchNIMService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return the new resource when no patches are needed', async () => {
    const result = await patchNIMService(mockNIMService, mockNIMService);
    expect(result).toBe(mockNIMService);
    expect(mockK8sPatch).not.toHaveBeenCalled();
  });

  it('should call k8sPatchResource when patches exist', async () => {
    const updated = { ...mockNIMService, spec: { ...mockNIMService.spec, replicas: 3 } };
    mockK8sPatch.mockResolvedValue(updated);
    await patchNIMService(mockNIMService, updated);
    expect(mockK8sPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        model: NIMServiceModel,
        queryOptions: expect.objectContaining({ name: 'test-nim', ns: 'test-ns' }),
      }),
    );
  });
});

describe('assembleNIMService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create a base NIMService with required fields', () => {
    const result = assembleNIMService({
      projectName: 'my-project',
      k8sName: 'my-nim',
      hardwareProfile: emptyHardwareProfile,
    });

    expect(result.apiVersion).toBe('apps.nvidia.com/v1alpha1');
    expect(result.kind).toBe('NIMService');
    expect(result.metadata.name).toBe('my-nim');
    expect(result.metadata.namespace).toBe('my-project');
    expect(result.spec.inferencePlatform).toBe('kserve');
    expect(result.spec.image.pullPolicy).toBe('IfNotPresent');
    expect(result.spec.expose?.service?.type).toBe('ClusterIP');
    expect(result.spec.expose?.service?.port).toBe(8000);
    expect(result.spec.annotations?.['serving.kserve.io/deploymentMode']).toBeUndefined();
    expect(result.spec.annotations?.['security.opendatahub.io/enable-auth']).toBe('false');
    expect(result.spec.replicas).toBe(1);
    expect(result.metadata.labels?.[KnownLabels.DASHBOARD_RESOURCE]).toBe('true');
  });

  it('should set auth annotation to true when tokenAuth is true', () => {
    const result = assembleNIMService({
      projectName: 'ns',
      k8sName: 'test',
      tokenAuth: true,
      hardwareProfile: emptyHardwareProfile,
    });

    expect(result.spec.annotations?.['security.opendatahub.io/enable-auth']).toBe('true');
  });

  it('should set auth annotation to false when tokenAuth is false', () => {
    const result = assembleNIMService({
      projectName: 'ns',
      k8sName: 'test',
      tokenAuth: false,
      hardwareProfile: emptyHardwareProfile,
    });

    expect(result.spec.annotations?.['security.opendatahub.io/enable-auth']).toBe('false');
  });

  it('should set display name and description in annotations', () => {
    const result = assembleNIMService({
      projectName: 'ns',
      k8sName: 'test',
      displayName: 'My Model',
      description: 'A test model',
      hardwareProfile: emptyHardwareProfile,
    });

    expect(result.metadata.annotations?.['openshift.io/display-name']).toBe('My Model');
    expect(result.metadata.annotations?.['openshift.io/description']).toBe('A test model');
  });

  it('should set replicas', () => {
    const result = assembleNIMService({
      projectName: 'ns',
      k8sName: 'test',
      replicas: 3,
      hardwareProfile: emptyHardwareProfile,
    });

    expect(result.spec.replicas).toBe(3);
  });

  it('should set visibility label when externalRoute is true', () => {
    const result = assembleNIMService({
      projectName: 'ns',
      k8sName: 'test',
      externalRoute: true,
      hardwareProfile: emptyHardwareProfile,
    });

    expect(result.spec.labels?.['networking.kserve.io/visibility']).toBe('exposed');
  });

  it('should remove visibility label when externalRoute is false', () => {
    const existing: NIMServiceKind = {
      ...mockNIMService,
      spec: {
        ...mockNIMService.spec,
        labels: { 'networking.kserve.io/visibility': 'exposed' },
      },
    };

    const result = assembleNIMService(
      {
        projectName: 'ns',
        k8sName: 'test',
        externalRoute: false,
        hardwareProfile: emptyHardwareProfile,
      },
      existing,
    );

    expect(result.spec.labels?.['networking.kserve.io/visibility']).toBeUndefined();
  });

  it('should set environment variables when enabled', () => {
    const result = assembleNIMService({
      projectName: 'ns',
      k8sName: 'test',
      environmentVariables: {
        enabled: true,
        variables: [
          { name: 'FOO', value: 'bar' },
          { name: 'BAZ', value: 'qux' },
        ],
      },
      hardwareProfile: emptyHardwareProfile,
    });

    expect(result.spec.env).toEqual([
      { name: 'FOO', value: 'bar' },
      { name: 'BAZ', value: 'qux' },
    ]);
  });

  it('should clear environment variables when disabled', () => {
    const existing: NIMServiceKind = {
      ...mockNIMService,
      spec: {
        ...mockNIMService.spec,
        env: [{ name: 'OLD', value: 'val' }],
      },
    };

    const result = assembleNIMService(
      {
        projectName: 'ns',
        k8sName: 'test',
        environmentVariables: { enabled: false, variables: [] },
        hardwareProfile: emptyHardwareProfile,
      },
      existing,
    );

    expect(result.spec.env).toBeUndefined();
  });

  it('should set runtime args when enabled', () => {
    const result = assembleNIMService({
      projectName: 'ns',
      k8sName: 'test',
      runtimeArgs: {
        enabled: true,
        args: ['--max-batch-size', '8', '--tensor-parallel-size', '2'],
      },
      hardwareProfile: emptyHardwareProfile,
    });

    expect(result.spec.args).toEqual(['--max-batch-size', '8', '--tensor-parallel-size', '2']);
  });

  it('should clear runtime args when disabled', () => {
    const existing: NIMServiceKind = {
      ...mockNIMService,
      spec: {
        ...mockNIMService.spec,
        args: ['--old-arg'],
      },
    };

    const result = assembleNIMService(
      {
        projectName: 'ns',
        k8sName: 'test',
        runtimeArgs: { enabled: false, args: [] },
        hardwareProfile: emptyHardwareProfile,
      },
      existing,
    );

    expect(result.spec.args).toBeUndefined();
  });

  it('should set authSecret and pullSecrets', () => {
    const result = assembleNIMService({
      projectName: 'ns',
      k8sName: 'test',
      authSecret: 'my-secret',
      pullSecrets: ['ngc-secret'],
      hardwareProfile: emptyHardwareProfile,
    });

    expect(result.spec.authSecret).toBe('my-secret');
    expect(result.spec.image.pullSecrets).toEqual(['ngc-secret']);
  });

  it('should apply hardware profile config', () => {
    assembleNIMService({
      projectName: 'ns',
      k8sName: 'test',
      hardwareProfile: emptyHardwareProfile,
    });

    expect(mockApplyHardwareProfile).toHaveBeenCalledWith(
      expect.any(Object),
      emptyHardwareProfile,
      expect.objectContaining({
        containerResourcesPath: 'spec.resources',
        tolerationsPath: 'spec.tolerations',
        nodeSelectorPath: 'spec.nodeSelector',
      }),
    );
  });
});
