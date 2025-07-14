import { genUID } from '#~/__mocks__/mockUtils';
import { KnownLabels, ResourceRule, RoleKind } from '#~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  rules?: ResourceRule[];
  roleRefName?: string;
  uid?: string;
  modelRegistryName?: string;
  isProjectSubject?: boolean;
};

export const mockRoleK8sResource = ({
  name = 'test-name-view',
  namespace = 'test-project',
  rules = [],
  uid = genUID('role'),
}: MockResourceConfigType): RoleKind => ({
  kind: 'Role',
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
  rules,
});
