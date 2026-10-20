import {
  DataScienceClusterKind,
  DataScienceClusterKindStatus,
  DataScienceClusterList,
  KubeFastifyInstance,
} from '../types';
import { createCustomError } from './requestUtils';

export const normalizeV3DscStatus = (dsc: DataScienceClusterKind): DataScienceClusterKindStatus => {
  const components = dsc.status.components ?? {};

  return {
    ...dsc.status,
    components: {
      ...components,
      // Keep the dashboard's established component keys while consuming the v3 DSC contract.
      modelregistry: components.aiHub ?? {},
      featureStore: dsc.spec.components?.data?.featureStore ?? {},
      dataRegistry: dsc.spec.components?.data?.dataRegistry ?? {},
    },
  };
};

export const fetchClusterStatus = async (
  fastify: KubeFastifyInstance,
): Promise<DataScienceClusterKindStatus> => {
  const result: DataScienceClusterKind | null = await fastify.kube.customObjectsApi
    .listClusterCustomObject('datasciencecluster.opendatahub.io', 'v3', 'datascienceclusters')
    .then((res) => (res.body as DataScienceClusterList).items[0])
    .catch((e) => {
      fastify.log.error(`Failure to fetch dsc: ${e.response.body}`);
      return null;
    });

  if (!result) {
    // The v3 DSC is the dashboard lifecycle source of truth.
    throw createCustomError('DSC Unavailable', 'Unable to get status', 404);
  }

  return normalizeV3DscStatus(result);
};
