import { K8sStatus, KnownLabels, KubeFastifyInstance } from '../../../types';
import { V1RoleBinding } from '@kubernetes/client-node';

const MODEL_REGISTRY_ROLE_BINDING_API_GROUP = 'rbac.authorization.k8s.io';
const MODEL_REGISTRY_ROLE_BINDING_API_VERSION = 'v1';
const MODEL_REGISTRY_ROLE_BINDING_PLURAL = 'rolebindings';

export const listModelRegistryRoleBindings = async (
  fastify: KubeFastifyInstance,
  mrNamespace: string,
): Promise<{ items: V1RoleBinding[] }> => {
  const response = await (fastify.kube.customObjectsApi.listNamespacedCustomObject(
    MODEL_REGISTRY_ROLE_BINDING_API_GROUP,
    MODEL_REGISTRY_ROLE_BINDING_API_VERSION,
    mrNamespace,
    MODEL_REGISTRY_ROLE_BINDING_PLURAL,
    undefined,
    undefined,
    undefined,
    KnownLabels.LABEL_SELECTOR_MODEL_REGISTRY,
  ) as Promise<{ body: { items: V1RoleBinding[] } }>);
  return response.body;
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
  const response = await (fastify.kube.customObjectsApi.createNamespacedCustomObject(
    MODEL_REGISTRY_ROLE_BINDING_API_GROUP,
    MODEL_REGISTRY_ROLE_BINDING_API_VERSION,
    mrNamespace,
    MODEL_REGISTRY_ROLE_BINDING_PLURAL,
    roleBindingWithNamespace,
  ) as Promise<{ body: V1RoleBinding }>);
  return response.body;
};

export const deleteModelRegistriesRolebinding = async (
  fastify: KubeFastifyInstance,
  roleBindingName: string,
  mrNamespace: string,
): Promise<K8sStatus> => {
  const response = await (fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
    MODEL_REGISTRY_ROLE_BINDING_API_GROUP,
    MODEL_REGISTRY_ROLE_BINDING_API_VERSION,
    mrNamespace,
    MODEL_REGISTRY_ROLE_BINDING_PLURAL,
    roleBindingName,
  ) as Promise<{ body: K8sStatus }>);

  return response.body;
};
