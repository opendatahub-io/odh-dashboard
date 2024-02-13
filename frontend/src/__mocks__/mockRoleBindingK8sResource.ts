import { genUID } from '~/__mocks__/mockUtils';
import { KnownLabels, RoleBindingKind } from '~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
};

export const mockRoleBindingK8sResource = ({
  name = 'test-name-view',
  namespace = 'test-project',
}: MockResourceConfigType): RoleBindingKind => ({
  kind: 'RoleBinding',
  apiVersion: 'rbac.authorization.k8s.io/v1',
  metadata: {
    name,
    namespace,
    uid: genUID('rolebinding'),
    creationTimestamp: '2023-02-14T21:43:59Z',
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
  },
  subjects: [
    {
      kind: 'ServiceAccount',
      name: 'test-name-sa',
    },
  ],
  roleRef: {
    apiGroup: 'rbac.authorization.k8s.io',
    kind: 'ClusterRole',
    name: 'view',
  },
});
