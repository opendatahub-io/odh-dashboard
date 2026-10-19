import { K8sStatus, KnownLabels, KubeFastifyInstance } from '../../../types';
import { V1RoleBinding } from '@kubernetes/client-node';

const MODEL_REGISTRY_ROLE_BINDING_API_GROUP = 'rbac.authorization.k8s.io';
const MODEL_REGISTRY_ROLE_BINDING_API_VERSION = 'v1';
const MODEL_REGISTRY_ROLE_BINDING_PLURAL = 'rolebindings';

export const listModelRegistryRoleBindings = async (
  fastify: KubeFastifyInstance,
  mrNamespace: string,
): Promise<{ items: V1RoleBinding[] }> => {
  return (await fastify.kube.customObjectsApi.listNamespacedCustomObject({
    group: MODEL_REGISTRY_ROLE_BINDING_API_GROUP,
    version: MODEL_REGISTRY_ROLE_BINDING_API_VERSION,
    namespace: mrNamespace,
    plural: MODEL_REGISTRY_ROLE_BINDING_PLURAL,
    labelSelector: KnownLabels.LABEL_SELECTOR_MODEL_REGISTRY,
  })) as { items: V1RoleBinding[] };
};

export const createModelRegistryRoleBinding = async (
  fastify: KubeFastifyInstance,
  rbRequest: V1RoleBinding,
  mrNamespace: string,
): Promise<V1RoleBinding> => {
  // Re-inject the namespace value that was omitted by the client
  //   (see createModelRegistryRoleBinding in frontend/src/services/modelRegistrySettingsService.ts)
  // This will be unnecessary when we remove the backend service as part of https://issues.redhat.com/browse/RHOAIENG-12077
  const roleBindingWithNamespace = {
    ...rbRequest,
    metadata: { ...rbRequest.metadata, namespace: mrNamespace },
  };
  return (await fastify.kube.customObjectsApi.createNamespacedCustomObject({
    group: MODEL_REGISTRY_ROLE_BINDING_API_GROUP,
    version: MODEL_REGISTRY_ROLE_BINDING_API_VERSION,
    namespace: mrNamespace,
    plural: MODEL_REGISTRY_ROLE_BINDING_PLURAL,
    body: roleBindingWithNamespace,
  })) as V1RoleBinding;
};

export const deleteModelRegistriesRolebinding = async (
  fastify: KubeFastifyInstance,
  roleBindingName: string,
  mrNamespace: string,
): Promise<K8sStatus> => {
  return (await fastify.kube.customObjectsApi.deleteNamespacedCustomObject({
    group: MODEL_REGISTRY_ROLE_BINDING_API_GROUP,
    version: MODEL_REGISTRY_ROLE_BINDING_API_VERSION,
    namespace: mrNamespace,
    plural: MODEL_REGISTRY_ROLE_BINDING_PLURAL,
    name: roleBindingName,
  })) as K8sStatus;
};
