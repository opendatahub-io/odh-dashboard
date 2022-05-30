import { PatchUtils } from '@kubernetes/client-node';
import { KubeFastifyInstance, DashboardConfig } from '../../../types';

export const setDashboardConfig = async (
  fastify: KubeFastifyInstance,
  request: any,
): Promise<DashboardConfig> => {
  const options = {
    headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
  };
  const response = await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
    'opendatahub.io',
    'v1alpha',
    fastify.kube.namespace,
    'odhdashboards',
    'odh-dashboard-config',
    request,
    undefined,
    undefined,
    undefined,
    options,
  );
  return response.body as DashboardConfig;
};
