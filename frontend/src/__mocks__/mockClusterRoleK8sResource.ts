import { genUID } from '#~/__mocks__/mockUtils';
import { KnownLabels, ResourceRule, ClusterRoleKind } from '#~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  rules?: ResourceRule[];
  labels?: Record<string, string>;
  uid?: string;
};

export const mockClusterRoleK8sResource = ({
  name = 'test-name-view',
  rules = [],
  labels,
  uid = genUID('clusterrole'),
}: MockResourceConfigType): ClusterRoleKind => ({
  kind: 'ClusterRole',
  apiVersion: 'rbac.authorization.k8s.io/v1',
  metadata: {
    name,
    uid,
    creationTimestamp: '2023-02-14T21:43:59Z',
    labels: labels ?? {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
  },
  rules,
});
