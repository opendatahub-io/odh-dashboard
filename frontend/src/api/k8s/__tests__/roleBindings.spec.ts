import {
  K8sStatus,
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sPatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockRoleBindingK8sResource } from '~/__mocks__/mockRoleBindingK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mock200Status, mock404Error } from '~/__mocks__/mockK8sStatus';
import { KnownLabels, RoleBindingKind, RoleBindingSubject } from '~/k8sTypes';
import {
  createRoleBinding,
  deleteRoleBinding,
  generateRoleBindingPermissions,
  generateRoleBindingServiceAccount,
  getRoleBinding,
  listRoleBindings,
  patchRoleBindingOwnerRef,
  patchRoleBindingSubjects,
} from '~/api/k8s/roleBindings';
import { RoleBindingModel } from '~/api/models/k8s';
import {
  RoleBindingPermissionsRBType,
  RoleBindingPermissionsRoleType,
} from '~/concepts/roleBinding/types';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sGetResource: jest.fn(),
  k8sCreateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
  k8sPatchResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource<RoleBindingKind>);
const k8sGetResourceMock = jest.mocked(k8sGetResource);
const k8sCreateResourceMock = jest.mocked(k8sCreateResource);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource<RoleBindingKind, K8sStatus>);
const k8sPatchResourceMock = jest.mocked(k8sPatchResource<RoleBindingKind>);

const roleBindingMock = mockRoleBindingK8sResource({});
const namespace = 'namespace';

const roleBindingObject: RoleBindingKind = {
  apiVersion: 'rbac.authorization.k8s.io/v1',
  kind: 'RoleBinding',
  metadata: {
    name: 'rbName',
    namespace,
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
  },
  roleRef: {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'ClusterRole',
    name: 'system:image-puller',
  },
  subjects: [
    {
      apiGroup: 'rbac.authorization.k8s.io',
      kind: 'Group',
      name: 'system:serviceaccounts:projectName',
    },
  ],
};
const createRoleBindingObject = (roleRefName: string, subjects: RoleBindingSubject[]) => ({
  ...roleBindingObject,
  roleRef: { ...roleBindingObject.roleRef, name: roleRefName },
  subjects,
});

describe('generateRoleBindingServingRuntime', () => {
  it('should generate serving runtime role binding ', () => {
    const result = generateRoleBindingServiceAccount(
      'rbName',
      'serviceAccountName',
      { kind: 'ClusterRole', name: 'view' },
      namespace,
    );
    const subjects = [
      {
        kind: 'ServiceAccount',
        name: 'serviceAccountName',
      },
    ];
    expect(result).toStrictEqual(createRoleBindingObject('view', subjects));
  });
});

describe('generateRoleBindingPermissions', () => {
  it('should generate project sharing role binding when RB type is USER and role type is EDIT', () => {
    const result = generateRoleBindingPermissions(
      namespace,
      RoleBindingPermissionsRBType.USER,
      'rbSubjectName',
      RoleBindingPermissionsRoleType.EDIT,
      'ClusterRole',
    );
    const subjects = [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: RoleBindingPermissionsRBType.USER,
        name: 'rbSubjectName',
      },
    ];
    createRoleBindingObject(RoleBindingPermissionsRoleType.EDIT, subjects);
    expect(result.apiVersion).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.EDIT, subjects).apiVersion,
    );
    expect(result.subjects).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.EDIT, subjects).subjects,
    );
    expect(result.roleRef).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.EDIT, subjects).roleRef,
    );
    expect(result.metadata.name).toMatch(/^dashboard-permissions-[a-zA-Z0-9]+$/);
    expect(result.metadata.labels).toStrictEqual({
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/project-sharing': 'true',
    });
  });

  it('should generate project sharing role binding when RB type is USER and role type is ADMIN', () => {
    const result = generateRoleBindingPermissions(
      namespace,
      RoleBindingPermissionsRBType.USER,
      'rbSubjectName',
      RoleBindingPermissionsRoleType.ADMIN,
      'ClusterRole',
    );
    const subjects = [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: RoleBindingPermissionsRBType.USER,
        name: 'rbSubjectName',
      },
    ];
    createRoleBindingObject(RoleBindingPermissionsRoleType.ADMIN, subjects);
    expect(result.apiVersion).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.ADMIN, subjects).apiVersion,
    );
    expect(result.subjects).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.ADMIN, subjects).subjects,
    );
    expect(result.roleRef).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.ADMIN, subjects).roleRef,
    );
    expect(result.metadata.name).toMatch(/^dashboard-permissions-[a-zA-Z0-9]+$/);
    expect(result.metadata.labels).toStrictEqual({
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/project-sharing': 'true',
    });
  });

  it('should generate project sharing role binding when RB type is GROUP and role type is EDIT', () => {
    const result = generateRoleBindingPermissions(
      namespace,
      RoleBindingPermissionsRBType.GROUP,
      'rbSubjectName',
      RoleBindingPermissionsRoleType.EDIT,
      'ClusterRole',
    );
    const subjects = [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: RoleBindingPermissionsRBType.GROUP,
        name: 'rbSubjectName',
      },
    ];
    createRoleBindingObject(RoleBindingPermissionsRoleType.EDIT, subjects);
    expect(result.apiVersion).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.EDIT, subjects).apiVersion,
    );
    expect(result.subjects).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.EDIT, subjects).subjects,
    );
    expect(result.roleRef).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.EDIT, subjects).roleRef,
    );
    expect(result.metadata.name).toMatch(/^dashboard-permissions-[a-zA-Z0-9]+$/);
    expect(result.metadata.labels).toStrictEqual({
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/project-sharing': 'true',
    });
  });

  it('should generate project sharing role binding when RB type is GROUP and role type is ADMIN', () => {
    const result = generateRoleBindingPermissions(
      namespace,
      RoleBindingPermissionsRBType.GROUP,
      'rbSubjectName',
      RoleBindingPermissionsRoleType.ADMIN,
      'ClusterRole',
    );
    const subjects = [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: RoleBindingPermissionsRBType.GROUP,
        name: 'rbSubjectName',
      },
    ];
    createRoleBindingObject(RoleBindingPermissionsRoleType.ADMIN, subjects);
    expect(result.apiVersion).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.ADMIN, subjects).apiVersion,
    );
    expect(result.subjects).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.ADMIN, subjects).subjects,
    );
    expect(result.roleRef).toStrictEqual(
      createRoleBindingObject(RoleBindingPermissionsRoleType.ADMIN, subjects).roleRef,
    );
    expect(result.metadata.name).toMatch(/^dashboard-permissions-[a-zA-Z0-9]+$/);
    expect(result.metadata.labels).toStrictEqual({
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/project-sharing': 'true',
    });
  });
});

describe('listRoleBindings', () => {
  it('should list role bindings without namespace and label selector', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([roleBindingMock]));
    const result = await listRoleBindings();
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: RoleBindingModel,
      queryOptions: {},
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([roleBindingMock]);
  });

  it('should list role bindings with namespace and label selector', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([roleBindingMock]));
    const result = await listRoleBindings(namespace, 'labelSelector');
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: RoleBindingModel,
      queryOptions: { ns: namespace, queryParams: { labelSelector: 'labelSelector' } },
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([roleBindingMock]);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error1'));
    await expect(listRoleBindings()).rejects.toThrow('error1');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: RoleBindingModel,
      queryOptions: {},
    });
  });
});

describe('getRoleBinding', () => {
  it('should fetch role bindings', async () => {
    k8sGetResourceMock.mockResolvedValue(roleBindingMock);
    const result = await getRoleBinding('projectName', 'rbName');
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: RoleBindingModel,
      queryOptions: { name: 'rbName', ns: 'projectName' },
    });
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(roleBindingMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sGetResourceMock.mockRejectedValue(new Error('error1'));
    await expect(getRoleBinding('projectName', 'rbName')).rejects.toThrow('error1');
    expect(k8sGetResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: RoleBindingModel,
      queryOptions: { name: 'rbName', ns: 'projectName' },
    });
  });
});

describe('createRoleBinding', () => {
  it('should create role bindings', async () => {
    k8sCreateResourceMock.mockResolvedValue(roleBindingMock);
    const result = await createRoleBinding(roleBindingMock);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RoleBindingModel,
      queryOptions: { queryParams: {} },
      resource: roleBindingMock,
    });
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(roleBindingMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sCreateResourceMock.mockRejectedValue(new Error('error1'));
    await expect(createRoleBinding(roleBindingObject)).rejects.toThrow('error1');
    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sCreateResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RoleBindingModel,
      queryOptions: { queryParams: {} },
      resource: roleBindingObject,
    });
  });
});

describe('deleteRoleBinding', () => {
  it('should return status as Success', async () => {
    const mockK8sStatus = mock200Status({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteRoleBinding('rbName', namespace);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RoleBindingModel,
      queryOptions: { name: 'rbName', ns: namespace, queryParams: {} },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockK8sStatus);
  });

  it('should return status as Failure', async () => {
    const mockK8sStatus = mock404Error({});
    k8sDeleteResourceMock.mockResolvedValue(mockK8sStatus);
    const result = await deleteRoleBinding('rbName', namespace);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RoleBindingModel,
      queryOptions: { name: 'rbName', ns: namespace, queryParams: {} },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockK8sStatus);
  });

  it('should handle errors and rethrow', async () => {
    k8sDeleteResourceMock.mockRejectedValue(new Error('error1'));
    await expect(deleteRoleBinding('rbName', namespace)).rejects.toThrow('error1');
    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RoleBindingModel,
      queryOptions: { name: 'rbName', ns: namespace, queryParams: {} },
    });
  });
});

describe('patchRoleBindingOwnerRef', () => {
  it('should patch role binding owner ref', async () => {
    k8sPatchResourceMock.mockResolvedValue(roleBindingMock);
    const result = await patchRoleBindingOwnerRef('rbName', namespace, []);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RoleBindingModel,
      patches: [{ op: 'replace', path: '/metadata/ownerReferences', value: [] }],
      queryOptions: { name: 'rbName', ns: namespace, queryParams: {} },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(roleBindingMock);
  });
});

describe('patchRoleBindingSubjects', () => {
  it('should patch role binding subjects', async () => {
    const newSubjects: RoleBindingSubject[] = [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: 'User',
        name: 'test-user',
      },
    ];
    k8sPatchResourceMock.mockResolvedValue(roleBindingMock);
    const result = await patchRoleBindingSubjects('rbName', namespace, newSubjects);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      fetchOptions: { requestInit: {} },
      model: RoleBindingModel,
      patches: [
        {
          op: 'replace',
          path: '/subjects',
          value: newSubjects,
        },
      ],
      queryOptions: { name: 'rbName', ns: namespace, queryParams: {} },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(roleBindingMock);
  });
});
