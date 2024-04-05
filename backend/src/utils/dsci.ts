import {
  DataScienceClusterInitializationKind,
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterInitializationList,
  KubeFastifyInstance,
} from '../types';
import { createCustomError } from './requestUtils';

export const getClusterInitialization = async (
  fastify: KubeFastifyInstance,
): Promise<DataScienceClusterInitializationKindStatus> => {
  const result: DataScienceClusterInitializationKind | null = await fastify.kube.customObjectsApi
    .listClusterCustomObject('dscinitialization.opendatahub.io', 'v1', 'dscinitializations')
    .then((res) => (res.body as DataScienceClusterInitializationList).items[0])
    .catch((e) => {
      fastify.log.error(`Failure to fetch dsci: ${e.response.body}`);
      return null;
    });

  if (!result) {
    throw createCustomError('DSCI Unavailable', 'Unable to get status', 404);
  }

  return result.status;
};
