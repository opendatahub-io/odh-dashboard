import {
  k8sCreateResource,
  k8sGetResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { KnownLabels } from '@odh-dashboard/k8s-core';
import { mockRoleK8sResource } from '#~/__mocks__/mockRoleK8sResource';
import { RoleKind } from '#~/k8sTypes';
import { createRole, generateRoleInferenceService, getRole, updateRole } from '#~/api/k8s/roles';
import { RoleModel } from '#~/api/models/k8s';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sGetResource: jest.fn(),
  k8sCreateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
  k8sUpdateResource: jest.fn(),
}));

const k8sGetResourceMock = jest.mocked(k8sGetResource);
const k8sCreateResourceMock = jest.mocked(k8sCreateResource);
const k8sUpdateResourceMock = jest.mocked(k8sUpdateResource<RoleKind>);

const namespace = 'namespace';
const roleMock = mockRoleK8sResource({ name: 'roleName', namespace });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('generateRoleInferenceService', () => {
  it('should generate role for inference service', () => {
    const result = generateRoleInferenceService('roleName', 'inferenceServiceName', namespace);
    expect(result).toStrictEqual({
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'Role',
      metadata: {
        name: 'roleName',
        namespace,
        labels: {
          [KnownLabels.DASHBOARD_RESOURCE]: 'true',
        },
      },
      rules: [
        {
          verbs: ['get'],
          apiGroups: ['serving.kserve.io'],
          resources: ['inferenceservices'],
          resourceNames: ['inferenceServiceName'],
        },
      ],
    } satisfies RoleKind);
  });
});

describe('getRole', () => {
  it('should fetch role', async () => {
    k8sGetResourceMock.mockResolvedValue(roleMock);
    const result = await getRole('projectName', 'roleName');
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: RoleModel,
      queryOptions: { name: 'roleName', ns: 'projectName' },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(roleMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error1'));
    await expect(getRole('projectName', 'roleName')).rejects.toThrow('error1');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: RoleModel,
      queryOptions: { name: 'roleName', ns: 'projectName' },
    });
  });
});

describe('createRole', () => {
  it('should create role', async () => {
    k8sCreateResourceMock.mockResolvedValue(roleMock);
    const result = await createRole(roleMock);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RoleModel,
      queryOptions: { queryParams: {} },
      resource: roleMock,
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(roleMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sCreateResourceMock.mockRejectedValue(new Error('error1'));
    await expect(createRole(roleMock)).rejects.toThrow('error1');
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RoleModel,
      queryOptions: { queryParams: {} },
      resource: roleMock,
    });
  });
});

describe('updateRole', () => {
  it('should update role', async () => {
    k8sUpdateResourceMock.mockResolvedValue(roleMock);
    const result = await updateRole(roleMock);
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RoleModel,
      queryOptions: { queryParams: {} },
      resource: roleMock,
    });
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(roleMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sUpdateResourceMock.mockRejectedValue(new Error('error1'));
    await expect(updateRole(roleMock)).rejects.toThrow('error1');
    expect(k8sUpdateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sUpdateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RoleModel,
      queryOptions: { queryParams: {} },
      resource: roleMock,
    });
  });
});
