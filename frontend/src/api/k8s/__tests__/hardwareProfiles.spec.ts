import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sStatus,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import * as _ from 'lodash-es';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { HardwareProfileFeatureVisibility, HardwareProfileKind } from '#~/k8sTypes';
import { HardwareProfileModel } from '#~/api/models';
import {
  createHardwareProfile,
  deleteHardwareProfile,
  getHardwareProfile,
  listHardwareProfiles,
  updateHardwareProfile,
} from '#~/api/k8s/hardwareProfiles';
import { mockHardwareProfile } from '#~/__mocks__/mockHardwareProfile';
import {
  IdentifierResourceType,
  TolerationEffect,
  TolerationOperator,
  SchedulingType,
  DisplayNameAnnotation,
} from '#~/types';
import { mock200Status, mock404Error } from '#~/__mocks__';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sCreateResource: jest.fn(),
  k8sUpdateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
  k8sGetResource: jest.fn(),
}));

const mockListResource = jest.mocked(k8sListResource<HardwareProfileKind>);
const mockGetResource = jest.mocked(k8sGetResource<HardwareProfileKind>);
const k8sCreateResourceMock = jest.mocked(k8sCreateResource<HardwareProfileKind>);
const k8sUpdateResourceMock = jest.mocked(k8sUpdateResource<HardwareProfileKind>);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<HardwareProfileKind, K8sStatus>);

global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));

const data: HardwareProfileKind['spec'] & {
  displayName: string;
  description: string;
  enabled: boolean;
} = {
  displayName: 'test',
  identifiers: [
    {
      displayName: 'Memory',
      identifier: 'memory',
      minCount: '2Gi',
      maxCount: '5Gi',
      defaultCount: '2Gi',
      resourceType: IdentifierResourceType.MEMORY,
    },
    {
      displayName: 'CPU',
      identifier: 'cpu',
      minCount: '1',
      maxCount: '2',
      defaultCount: '1',
      resourceType: IdentifierResourceType.CPU,
    },
  ],
  description: 'test description',
  enabled: true,
  scheduling: {
    type: SchedulingType.NODE,
    node: {
      tolerations: [
        {
          key: 'nvidia.com/gpu',
          operator: TolerationOperator.EXISTS,
          effect: TolerationEffect.NO_SCHEDULE,
        },
      ],
    },
  },
};

const assembleHardwareProfileResult: HardwareProfileKind = {
  apiVersion: 'infrastructure.opendatahub.io/v1alpha1',
  kind: 'HardwareProfile',
  metadata: {
    name: 'test-1',
    namespace: 'namespace',
    annotations: {
      [DisplayNameAnnotation.ODH_DISP_NAME]: data.displayName,
      [DisplayNameAnnotation.ODH_DESC]: data.description,
      'opendatahub.io/disabled': JSON.stringify(!data.enabled),
      'opendatahub.io/dashboard-feature-visibility': '[]',
      'opendatahub.io/modified-date': expect.any(String),
    },
  },
  spec: _.omit(data, ['displayName', 'enabled', 'description']),
};

describe('listHardwareProfile', () => {
  it('should fetch and return list of hardware profile', async () => {
    const namespace = 'test-project';
    mockListResource.mockResolvedValue(
      mockK8sResourceList([mockHardwareProfile({ uid: 'test-project-12' })]),
    );

    const result = await listHardwareProfiles(namespace);
    expect(mockListResource).toHaveBeenCalledWith({
      model: HardwareProfileModel,
      queryOptions: {
        ns: namespace,
      },
    });
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([mockHardwareProfile({ uid: 'test-project-12' })]);
  });

  it('should handle errors when fetching list of hardware profile', async () => {
    const namespace = 'test-project';
    mockListResource.mockRejectedValue(new Error('error1'));

    await expect(listHardwareProfiles(namespace)).rejects.toThrow('error1');
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(mockListResource).toHaveBeenCalledWith({
      model: HardwareProfileModel,
      queryOptions: {
        ns: namespace,
      },
    });
  });
});

describe('getHardwareProfile', () => {
  it('should fetch and return specific hardware profile', async () => {
    const namespace = 'test-project';
    const projectName = 'test';
    mockGetResource.mockResolvedValue(mockHardwareProfile({ uid: 'test-project-12' }));

    const result = await getHardwareProfile(projectName, namespace);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: HardwareProfileModel,
      queryOptions: {
        name: projectName,
        ns: namespace,
      },
    });
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockHardwareProfile({ uid: 'test-project-12' }));
  });

  it('should handle errors when fetching a specific hardware profile', async () => {
    const namespace = 'test-project';
    const projectName = 'test';
    mockGetResource.mockRejectedValue(new Error('error1'));

    await expect(getHardwareProfile(projectName, namespace)).rejects.toThrow('error1');
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: HardwareProfileModel,
      queryOptions: {
        name: projectName,
        ns: namespace,
      },
    });
  });
});

describe('createHardwareProfiles', () => {
  it('should create hardware profile', async () => {
    k8sCreateResourceMock.mockResolvedValue(mockHardwareProfile({ uid: 'test' }));
    const result = await createHardwareProfile('test-1', data, 'namespace');
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: HardwareProfileModel,
      queryOptions: { queryParams: {} },
      resource: assembleHardwareProfileResult,
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockHardwareProfile({ uid: 'test' }));
  });

  it('should set visibility as expected array when it is limited and set the values', async () => {
    k8sCreateResourceMock.mockResolvedValue(mockHardwareProfile({ uid: 'test' }));
    const result = await createHardwareProfile('test-1', data, 'namespace', [
      HardwareProfileFeatureVisibility.WORKBENCH,
    ]);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: HardwareProfileModel,
      queryOptions: { queryParams: {} },
      resource: {
        ...assembleHardwareProfileResult,
        metadata: {
          ...assembleHardwareProfileResult.metadata,
          annotations: {
            'opendatahub.io/display-name': 'test',
            'opendatahub.io/description': 'test description',
            'opendatahub.io/disabled': 'false',
            'opendatahub.io/modified-date': expect.any(String),
            'opendatahub.io/dashboard-feature-visibility': '["workbench"]',
          },
        },
      },
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockHardwareProfile({ uid: 'test' }));
  });

  it('should handle errors and rethrow', async () => {
    k8sCreateResourceMock.mockRejectedValue(new Error('error1'));
    await expect(createHardwareProfile('test-1', data, 'namespace')).rejects.toThrow('error1');
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: HardwareProfileModel,
      queryOptions: { queryParams: {} },
      resource: assembleHardwareProfileResult,
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
  });
});

describe('updateHardwareProfile', () => {
  it('should update hardware profile', async () => {
    k8sUpdateResourceMock.mockResolvedValue(
      mockHardwareProfile({
        uid: 'test',
        displayName: 'test',
        description: 'test description',
      }),
    );
    const result = await updateHardwareProfile(
      data,
      mockHardwareProfile({ uid: 'test-1' }),
      'namespace',
    );
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(
      mockHardwareProfile({
        uid: 'test',
        displayName: 'test',
        description: 'test description',
      }),
    );
  });

  it('should handle errors and rethrow', async () => {
    k8sUpdateResourceMock.mockRejectedValue(new Error('error1'));
    await expect(
      updateHardwareProfile(data, mockHardwareProfile({ uid: 'test-1' }), 'namespace'),
    ).rejects.toThrow('error1');
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: HardwareProfileModel,
      queryOptions: { queryParams: {} },
      resource: mockHardwareProfile({
        uid: 'test-1',
        namespace: 'namespace',
        description: 'test description',
        displayName: 'test',
        nodeSelector: {},
        annotations: {
          'opendatahub.io/display-name': 'test',
          'opendatahub.io/description': 'test description',
          'opendatahub.io/disabled': 'false',
          'opendatahub.io/modified-date': expect.any(String),
          'opendatahub.io/dashboard-feature-visibility': '[]',
        },
      }),
    });
  });
});

describe('deleteHardwareProfile', () => {
  it('should return status as Success', async () => {
    const mockK8sStatus = mock200Status({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteHardwareProfile('hardwareProfileName', 'namespace');
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: HardwareProfileModel,
      queryOptions: { name: 'hardwareProfileName', ns: 'namespace', queryParams: {} },
      fetchOptions: { requestInit: {} },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockK8sStatus);
  });

  it('should return status as Failure', async () => {
    const mockK8sStatus = mock404Error({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteHardwareProfile('hardwareProfileName', 'namespace');
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: HardwareProfileModel,
      queryOptions: { name: 'hardwareProfileName', ns: 'namespace', queryParams: {} },
      fetchOptions: { requestInit: {} },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockK8sStatus);
  });

  it('should handle errors and rethrow', async () => {
    k8sDeleteResourceMock.mockRejectedValue(new Error('error1'));
    await expect(deleteHardwareProfile('hardwareProfileName', 'namespace')).rejects.toThrow(
      'error1',
    );
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: HardwareProfileModel,
      queryOptions: { name: 'hardwareProfileName', ns: 'namespace', queryParams: {} },
      fetchOptions: { requestInit: {} },
    });
  });
});
