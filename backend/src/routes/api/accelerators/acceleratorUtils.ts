import { DetectedAccelerators, KubeFastifyInstance } from '../../../types';

const RESOURCE_TYPES = [
  'cpu',
  'memory',
  'pods',
  'ephemeral-storage',
  'hugepages-1Gi',
  'hugepages-2Mi',
  'attachable-volumes-aws-ebs',
];

const getIdentifiersFromResources = (resources: { [key: string]: string } = {}) => {
  return Object.entries(resources)
    .filter(([key]) => !RESOURCE_TYPES.includes(key))
    .reduce<{ [key: string]: number }>((identifiers, [key, value]) => {
      identifiers[key] = isNaN(parseInt(value)) ? 0 : parseInt(value);
      return identifiers;
    }, {});
};

export const getDetectedAccelerators = async (
  fastify: KubeFastifyInstance,
): Promise<DetectedAccelerators> =>
  fastify.kube.coreV1Api
    .listNode()
    .then((res) =>
      res.body.items.reduce<DetectedAccelerators>(
        (info, node) => {
          // reduce resources down to just the accelerators and their counts
          const allocatable = getIdentifiersFromResources(node.status.allocatable);
          const capacity = getIdentifiersFromResources(node.status.capacity);

          // update the max count for each accelerator
          Object.entries(allocatable).forEach(
            ([key, value]) => (info.available[key] = Math.max(info.available[key] ?? 0, value)),
          );

          // update the total count for each accelerator
          Object.entries(capacity).forEach(
            ([key, value]) => (info.total[key] = (info.total[key] ?? 0) + value),
          );

          // update the allocated count for each accelerator
          Object.entries(capacity).forEach(
            ([key, value]) =>
              (info.allocated[key] = (info.allocated[key] ?? 0) + value - (allocatable[key] ?? 0)),
          );

          // if any accelerators are available, the cluster is configured
          const configured =
            info.configured || Object.values(info.available).some((value) => value > 0);

          return {
            total: info.total,
            available: info.available,
            allocated: info.allocated,
            configured,
          };
        },
        { configured: false, available: {}, total: {}, allocated: {} },
      ),
    )
    .catch((e) => {
      fastify.log.error(
        `A ${e.statusCode} error occurred when listing cluster nodes: ${
          e.response?.body?.message || e.statusMessage
        }`,
      );
      return { configured: false, available: {}, total: {}, allocated: {} };
    });
