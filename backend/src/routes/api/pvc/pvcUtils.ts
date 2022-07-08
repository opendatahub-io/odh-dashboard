import {
  KubeFastifyInstance,
  PersistentVolumeClaimKind,
  PersistentVolumeClaimListKind,
} from '../../../types';

export const getPVC = async (
  fastify: KubeFastifyInstance,
  pvcName: string,
): Promise<PersistentVolumeClaimListKind | PersistentVolumeClaimKind> => {
  let kubeResponse;
  try {
    kubeResponse = await fastify.kube.coreV1Api.readNamespacedPersistentVolumeClaim(
      pvcName,
      fastify.kube.namespace,
    );
    return kubeResponse.body as PersistentVolumeClaimKind;
  } catch (e) {
    if (e.response?.statusCode === 404) {
      return null;
    }
    throw e;
  }
};

export const createPVC = async (
  fastify: KubeFastifyInstance,
  pvcData: PersistentVolumeClaimKind,
): Promise<PersistentVolumeClaimKind> => {
  const kubeResponse = await fastify.kube.coreV1Api.createNamespacedPersistentVolumeClaim(
    fastify.kube.namespace,
    pvcData,
  );
  return kubeResponse.body as PersistentVolumeClaimKind;
};
