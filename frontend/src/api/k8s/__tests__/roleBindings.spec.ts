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
  ProjectSharingRBType,
  ProjectSharingRoleType,
} from '~/pages/projects/projectSharing/types';
import {
  createRoleBinding,
  deleteRoleBinding,
  generateRoleBindingData,
  generateRoleBindingProjectSharing,
  generateRoleBindingServingRuntime,
  getRoleBinding,
  listRoleBindings,
  patchRoleBindingName,
  patchRoleBindingOwnerRef,
} from '~/api/k8s/roleBindings';

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
describe('generateRoleBindingData', () => {
  it('should generate role binding data', () => {
    const result = generateRoleBindingData('rbName', namespace, 'projectName');
    expect(result).toStrictEqual(roleBindingObject);
  });
});

describe('generateRoleBindingServingRuntime', () => {
  it('should generate serving runtime role binding ', () => {
    const result = generateRoleBindingServingRuntime('rbName', 'serviceAccountName', namespace);
    const subjects = [
      {
        kind: 'ServiceAccount',
        name: 'serviceAccountName',
      },
    ];
    expect(result).toStrictEqual(createRoleBindingObject('view', subjects));
  });
});

describe('generateRoleBindingProjectSharing', () => {
  it('should generate project sharing role binding when RB type is USER and role type is EDIT', () => {
    const result = generateRoleBindingProjectSharing(
      namespace,
      ProjectSharingRBType.USER,
      'rbSubjectName',
      ProjectSharingRoleType.EDIT,
    );
    const subjects = [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: ProjectSharingRBType.USER,
        name: 'rbSubjectName',
      },
    ];
    createRoleBindingObject(ProjectSharingRoleType.EDIT, subjects);
    expect(result.apiVersion).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.EDIT, subjects).apiVersion,
    );
    expect(result.subjects).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.EDIT, subjects).subjects,
    );
    expect(result.roleRef).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.EDIT, subjects).roleRef,
    );
    expect(result.metadata.name).toMatch(/^dashboard-permissions-[a-zA-Z0-9]+$/);
    expect(result.metadata.labels).toStrictEqual({
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/project-sharing': 'true',
    });
  });

  it('should generate project sharing role binding when RB type is USER and role type is ADMIN', () => {
    const result = generateRoleBindingProjectSharing(
      namespace,
      ProjectSharingRBType.USER,
      'rbSubjectName',
      ProjectSharingRoleType.ADMIN,
    );
    const subjects = [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: ProjectSharingRBType.USER,
        name: 'rbSubjectName',
      },
    ];
    createRoleBindingObject(ProjectSharingRoleType.ADMIN, subjects);
    expect(result.apiVersion).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.ADMIN, subjects).apiVersion,
    );
    expect(result.subjects).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.ADMIN, subjects).subjects,
    );
    expect(result.roleRef).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.ADMIN, subjects).roleRef,
    );
    expect(result.metadata.name).toMatch(/^dashboard-permissions-[a-zA-Z0-9]+$/);
    expect(result.metadata.labels).toStrictEqual({
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/project-sharing': 'true',
    });
  });

  it('should generate project sharing role binding when RB type is GROUP and role type is EDIT', () => {
    const result = generateRoleBindingProjectSharing(
      namespace,
      ProjectSharingRBType.GROUP,
      'rbSubjectName',
      ProjectSharingRoleType.EDIT,
    );
    const subjects = [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: ProjectSharingRBType.GROUP,
        name: 'rbSubjectName',
      },
    ];
    createRoleBindingObject(ProjectSharingRoleType.EDIT, subjects);
    expect(result.apiVersion).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.EDIT, subjects).apiVersion,
    );
    expect(result.subjects).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.EDIT, subjects).subjects,
    );
    expect(result.roleRef).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.EDIT, subjects).roleRef,
    );
    expect(result.metadata.name).toMatch(/^dashboard-permissions-[a-zA-Z0-9]+$/);
    expect(result.metadata.labels).toStrictEqual({
      'opendatahub.io/dashboard': 'true',
      'opendatahub.io/project-sharing': 'true',
    });
  });

  it('should generate project sharing role binding when RB type is GROUP and role type is ADMIN', () => {
    const result = generateRoleBindingProjectSharing(
      namespace,
      ProjectSharingRBType.GROUP,
      'rbSubjectName',
      ProjectSharingRoleType.ADMIN,
    );
    const subjects = [
      {
        apiGroup: 'rbac.authorization.k8s.io',
        kind: ProjectSharingRBType.GROUP,
        name: 'rbSubjectName',
      },
    ];
    createRoleBindingObject(ProjectSharingRoleType.ADMIN, subjects);
    expect(result.apiVersion).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.ADMIN, subjects).apiVersion,
    );
    expect(result.subjects).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.ADMIN, subjects).subjects,
    );
    expect(result.roleRef).toStrictEqual(
      createRoleBindingObject(ProjectSharingRoleType.ADMIN, subjects).roleRef,
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
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
      queryOptions: {},
    });
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([roleBindingMock]);
  });

  it('should list role bindings with namespace and label selector', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([roleBindingMock]));
    const result = await listRoleBindings(namespace, 'labelSelector');
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
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
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
      queryOptions: {},
    });
  });
});

describe('getRoleBinding', () => {
  it('should fetch role bindings', async () => {
    k8sGetResourceMock.mockResolvedValue(roleBindingMock);
    const result = await getRoleBinding('projectName', 'rbName');
    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
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
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
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
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
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
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
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
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
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
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
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
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
      queryOptions: { name: 'rbName', ns: namespace, queryParams: {} },
    });
  });
});

describe('patchRoleBindingName', () => {
  it('should patch role binding name when role type is ADMIN', async () => {
    k8sPatchResourceMock.mockResolvedValue(roleBindingMock);
    const result = await patchRoleBindingName('rbName', namespace, ProjectSharingRoleType.ADMIN);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
      patches: [{ op: 'replace', path: '/roleRef/name', value: 'admin' }],
      queryOptions: { name: 'rbName', ns: namespace },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(roleBindingMock);
  });

  it('should patch role binding name when role type is EDIT', async () => {
    k8sPatchResourceMock.mockResolvedValue(roleBindingMock);
    const result = await patchRoleBindingName('rbName', namespace, ProjectSharingRoleType.EDIT);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
      patches: [{ op: 'replace', path: '/roleRef/name', value: 'edit' }],
      queryOptions: { name: 'rbName', ns: namespace },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(roleBindingMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sPatchResourceMock.mockRejectedValue(new Error('error1'));
    await expect(
      patchRoleBindingName('rbName', namespace, ProjectSharingRoleType.EDIT),
    ).rejects.toThrow('error1');
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
      patches: [{ op: 'replace', path: '/roleRef/name', value: 'edit' }],
      queryOptions: { name: 'rbName', ns: namespace },
    });
  });
});

describe('patchRoleBindingOwnerRef', () => {
  it('should patch role binding owner ref', async () => {
    k8sPatchResourceMock.mockResolvedValue(roleBindingMock);
    const result = await patchRoleBindingOwnerRef('rbName', namespace, []);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
      patches: [{ op: 'replace', path: '/metadata/ownerReferences', value: [] }],
      queryOptions: { name: 'rbName', ns: namespace },
    });
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(roleBindingMock);
  });

  it('should handle errors and rethrow', async () => {
    k8sPatchResourceMock.mockRejectedValue(new Error('error1'));
    await expect(
      patchRoleBindingName('rbName', namespace, ProjectSharingRoleType.EDIT),
    ).rejects.toThrow('error1');
    expect(k8sPatchResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sPatchResourceMock).toHaveBeenCalledWith({
      model: {
        apiGroup: 'rbac.authorization.k8s.io',
        apiVersion: 'v1',
        kind: 'RoleBinding',
        plural: 'rolebindings',
      },
      patches: [{ op: 'replace', path: '/roleRef/name', value: 'edit' }],
      queryOptions: { name: 'rbName', ns: namespace },
    });
  });
});
