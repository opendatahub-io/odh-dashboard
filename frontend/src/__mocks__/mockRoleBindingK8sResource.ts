import { genUID } from '~/__mocks__/mockUtils';
import { KnownLabels, RoleBindingKind } from '~/k8sTypes';
import { RoleBindingSubject } from '~/types';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  subjects?: RoleBindingSubject[];
  roleRefName?: string;
  uid?: string;
};

export const mockRoleBindingK8sResource = ({
  name = 'test-name-view',
  namespace = 'test-project',
  subjects = [
    {
      kind: 'ServiceAccount',
      apiGroup: 'rbac.authorization.k8s.io',
      name: 'test-name-sa',
    },
  ],
  roleRefName = 'view',
  uid = genUID('rolebinding'),
}: MockResourceConfigType): RoleBindingKind => ({
  kind: 'RoleBinding',
  apiVersion: 'rbac.authorization.k8s.io/v1',
  metadata: {
    name,
    namespace,
    uid,
    creationTimestamp: '2023-02-14T21:43:59Z',
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
  },
  subjects,
  roleRef: {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'ClusterRole',
    name: roleRefName,
  },
});
