import {
  DataScienceClusterKind,
  DataScienceClusterKindStatus,
  DataScienceClusterList,
  KubeFastifyInstance,
} from '../types';
import { createCustomError } from './requestUtils';

export const fetchClusterStatus = async (
  fastify: KubeFastifyInstance,
): Promise<DataScienceClusterKindStatus> => {
  const result: DataScienceClusterKind | null = await fastify.kube.customObjectsApi
    .listClusterCustomObject({
      group: 'datasciencecluster.opendatahub.io',
      version: 'v2',
      plural: 'datascienceclusters',
    })
    .then((res) => (res as DataScienceClusterList).items[0])
    .catch((e) => {
      fastify.log.error(`Failure to fetch dsc: ${e.response.body}`);
      return null;
    });

  if (!result) {
    // May not be using v2 Operator
    throw createCustomError('DSC Unavailable', 'Unable to get status', 404);
  }

  return result.status;
};
