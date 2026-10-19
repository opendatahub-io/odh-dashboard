import { V1ConfigMap } from '@kubernetes/client-node';
import type { RecursivePartial } from '@odh-dashboard/foundation';
import { KnownLabels, KubeFastifyInstance } from '../../../types';
import { getNamespaces } from '../../../utils/notebookUtils';
import { errorHandler } from '../../../utils';
import { JSON_PATCH } from '../../../utils/k8sClient';

const isConnectionTypeConfigMap = (configMap: V1ConfigMap): boolean =>
  configMap.metadata.labels &&
  configMap.metadata.labels[KnownLabels.DASHBOARD_RESOURCE] === 'true' &&
  configMap.metadata.labels[KnownLabels.CONNECTION_TYPE] === 'true';

const isExistingConnectionType = async (
  fastify: KubeFastifyInstance,
  name: string,
): Promise<boolean> => {
  const coreV1Api = fastify.kube.coreV1Api;
  const { dashboardNamespace } = getNamespaces(fastify);

  const response = await coreV1Api.readNamespacedConfigMap({ name, namespace: dashboardNamespace });
  return isConnectionTypeConfigMap(response);
};

export const listConnectionTypes = async (fastify: KubeFastifyInstance): Promise<V1ConfigMap[]> => {
  const { dashboardNamespace } = getNamespaces(fastify);
  const coreV1Api = fastify.kube.coreV1Api;
  const connectionTypes: V1ConfigMap[] = [];

  let _continue: string = undefined;
  let remainingItemCount = 1;
  try {
    while (remainingItemCount) {
      const response = await coreV1Api.listNamespacedConfigMap({
        namespace: dashboardNamespace,
        _continue,
        labelSelector: `${KnownLabels.DASHBOARD_RESOURCE} = true, ${KnownLabels.CONNECTION_TYPE} = true`,
      });
      connectionTypes.push(...(response?.items ?? []));
      remainingItemCount = response?.metadata?.remainingItemCount;
      _continue = response?.metadata?._continue;
    }
    return connectionTypes;
  } catch (e) {
    fastify.log.error(e, `Error fetching configmaps for connection types: `);
    throw new Error(`Failed to list connection types: ${errorHandler(e)}.`);
  }
};

export const getConnectionType = async (
  fastify: KubeFastifyInstance,
  name: string,
): Promise<V1ConfigMap> => {
  const { dashboardNamespace } = getNamespaces(fastify);
  const coreV1Api = fastify.kube.coreV1Api;
  try {
    const response = await coreV1Api.readNamespacedConfigMap({
      name,
      namespace: dashboardNamespace,
    });
    if (!isConnectionTypeConfigMap(response)) {
      throw new Error(`object is not a connection type.`);
    }
    return response;
  } catch (e) {
    fastify.log.error(e, `Error fetching connection type: `);
    throw new Error(`Failed to get connection type: ${errorHandler(e)}.`);
  }
};

export const createConnectionType = async (
  fastify: KubeFastifyInstance,
  connectionType: V1ConfigMap,
): Promise<{ success: boolean; error: string }> => {
  const coreV1Api = fastify.kube.coreV1Api;
  const { dashboardNamespace } = getNamespaces(fastify);

  if (!isConnectionTypeConfigMap(connectionType)) {
    const error = 'Unable to add connection type, incorrect labels.';
    fastify.log.error(error);
    return { success: false, error };
  }

  try {
    await coreV1Api.createNamespacedConfigMap({
      namespace: dashboardNamespace,
      body: connectionType,
    });
    return { success: true, error: '' };
  } catch (e) {
    const error = `Unable to add connection type: ${errorHandler(e)}.`;
    fastify.log.error(error);
    return { success: false, error };
  }
};

export const updateConnectionType = async (
  fastify: KubeFastifyInstance,
  name: string,
  connectionType: V1ConfigMap,
): Promise<{ success: boolean; error: string }> => {
  const coreV1Api = fastify.kube.coreV1Api;
  const { dashboardNamespace } = getNamespaces(fastify);

  if (!isConnectionTypeConfigMap(connectionType)) {
    const error = 'Unable to add connection type, incorrect labels.';
    fastify.log.error(error);
    return { success: false, error };
  }

  try {
    const validConnectionType = await isExistingConnectionType(fastify, name);
    if (!validConnectionType) {
      const error = `Unable to update connection type, object is not a connection type`;
      fastify.log.error(error);
      return { success: false, error };
    }

    await coreV1Api.replaceNamespacedConfigMap({
      name,
      namespace: dashboardNamespace,
      body: connectionType,
    });
    return { success: true, error: '' };
  } catch (e) {
    const error = `Unable to update connection type: ${errorHandler(e)}.`;
    fastify.log.error(error);
    return { success: false, error };
  }
};

export const patchConnectionType = async (
  fastify: KubeFastifyInstance,
  name: string,
  partialConfigMap: RecursivePartial<V1ConfigMap>,
): Promise<{ success: boolean; error: string }> => {
  const coreV1Api = fastify.kube.coreV1Api;
  const { dashboardNamespace } = getNamespaces(fastify);

  if (
    (partialConfigMap.metadata?.labels?.[KnownLabels.DASHBOARD_RESOURCE] &&
      partialConfigMap.metadata.labels[KnownLabels.DASHBOARD_RESOURCE] !== 'true') ||
    (partialConfigMap.metadata?.labels?.[KnownLabels.CONNECTION_TYPE] &&
      partialConfigMap.metadata.labels[KnownLabels.CONNECTION_TYPE] !== 'true')
  ) {
    const error = 'Unable to update connection type, incorrect labels.';
    fastify.log.error(error);
    return { success: false, error };
  }

  try {
    const validConnectionType = await isExistingConnectionType(fastify, name);
    if (!validConnectionType) {
      const error = `Unable to update connection type, object is not a connection type`;
      fastify.log.error(error);
      return { success: false, error };
    }
    await coreV1Api.patchNamespacedConfigMap(
      { name, namespace: dashboardNamespace, body: partialConfigMap },
      JSON_PATCH,
    );
    return { success: true, error: '' };
  } catch (e) {
    const error = `Unable to update connection type: ${errorHandler(e)}.`;
    fastify.log.error(error);
    return { success: false, error };
  }
};

export const deleteConnectionType = async (
  fastify: KubeFastifyInstance,
  name: string,
): Promise<{ success: boolean; error: string }> => {
  const { dashboardNamespace } = getNamespaces(fastify);
  const coreV1Api = fastify.kube.coreV1Api;
  try {
    const validConnectionType = await isExistingConnectionType(fastify, name);
    if (!validConnectionType) {
      const error = `Unable to delete connection type, object is not a connection type`;
      fastify.log.error(error);
      return { success: false, error };
    }
    await coreV1Api.deleteNamespacedConfigMap({ name, namespace: dashboardNamespace });
    return { success: true, error: '' };
  } catch (e) {
    const error = `Unable to delete connection type: ${errorHandler(e)}.`;
    fastify.log.error(error);
    return { success: false, error };
  }
};
