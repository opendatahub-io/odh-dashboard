import type { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

/** Kubernetes discovery metadata, not a list of resource instances or an RBAC grant. */
export const mockK8sAPIResourceList = (
  groupVersion: string,
  models: K8sModelCommon[],
): {
  apiVersion: string;
  kind: string;
  groupVersion: string;
  resources: { name: string; kind: string; namespaced: boolean; verbs: string[] }[];
} => ({
  apiVersion: 'v1',
  kind: 'APIResourceList',
  groupVersion,
  resources: models.map((model) => ({
    name: model.plural,
    kind: model.kind,
    namespaced: true,
    verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'],
  })),
});
