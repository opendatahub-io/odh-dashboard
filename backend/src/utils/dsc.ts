import {
  DataScienceClusterKind,
  DataScienceClusterKindStatus,
  DataScienceClusterList,
  KubeFastifyInstance,
} from '../types';
import { createCustomError } from './requestUtils';

export const normalizeV2DscStatus = (dsc: DataScienceClusterKind): DataScienceClusterKindStatus => {
  const feastOperator = dsc.spec.components?.feastoperator;

  return {
    ...dsc.status,
    components: {
      ...dsc.status.components,
      // The v2 conversion maps v3 data.featureStore to feastoperator.managementState.
      // The feastoperator status itself represents the shared operand, not either child.
      featureStore: { managementState: feastOperator?.managementState ?? 'Removed' },
      dataRegistry: { managementState: feastOperator?.dataRegistry?.managementState ?? 'Removed' },
    },
  };
};

export const fetchClusterStatus = async (
  fastify: KubeFastifyInstance,
): Promise<DataScienceClusterKindStatus> => {
  const result: DataScienceClusterKind | null = await fastify.kube.customObjectsApi
    .listClusterCustomObject('datasciencecluster.opendatahub.io', 'v2', 'datascienceclusters')
    .then((res) => (res.body as DataScienceClusterList).items[0])
    .catch((e) => {
      fastify.log.error(`Failure to fetch dsc: ${e.response.body}`);
      return null;
    });

  if (!result) {
    // The converted v2 DSC is unavailable.
    throw createCustomError('DSC Unavailable', 'Unable to get status', 404);
  }

  return normalizeV2DscStatus(result);
};
