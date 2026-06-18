import { KnownLabels } from '@odh-dashboard/k8s-core';
import type { ResourceRule, RoleKind } from '#~/k8sTypes';
import type { RuleEntry } from './types';

type AssembledRole = RoleKind & { rules: ResourceRule[] };

const assembleRole = (
  namespace: string,
  k8sName: string,
  displayName: string,
  description: string,
  rules: RuleEntry[],
  labels: Record<string, string> = {},
): AssembledRole => ({
  apiVersion: 'rbac.authorization.k8s.io/v1',
  kind: 'Role',
  metadata: {
    name: k8sName,
    namespace,
    labels: {
      ...labels,
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
    annotations: {
      'openshift.io/display-name': displayName,
      ...(description ? { 'openshift.io/description': description } : {}),
    },
  },
  rules: rules.map((rule) => ({
    verbs: rule.verbs,
    ...(rule.apiGroups && { apiGroups: rule.apiGroups }),
    ...(rule.resources && { resources: rule.resources }),
    ...(rule.resourceNames && { resourceNames: rule.resourceNames }),
  })),
});

export default assembleRole;
