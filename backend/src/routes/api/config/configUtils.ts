import { getDashboardConfig, updateDashboardConfig } from '../../../utils/resourceUtils';
import type { RecursivePartial } from '@odh-dashboard/foundation';
import { KubeFastifyInstance, DashboardConfig } from '../../../types';
import { MERGE_PATCH } from '../../../utils/k8sClient';

export const setDashboardConfig = async (
  fastify: KubeFastifyInstance,
  request: RecursivePartial<DashboardConfig>,
): Promise<DashboardConfig> => {
  await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
    {
      group: 'opendatahub.io',
      version: 'v1alpha',
      namespace: fastify.kube.namespace,
      plural: 'odhdashboardconfigs',
      name: 'odh-dashboard-config',
      body: request,
    },
    MERGE_PATCH,
  );
  await updateDashboardConfig();
  return getDashboardConfig();
};
