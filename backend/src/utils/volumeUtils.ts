import { PatchUtils } from '@kubernetes/client-node';
import { KubeFastifyInstance, PersistentVolumeClaimKind } from '../types';

export const movePVC = async (
  fastify: KubeFastifyInstance,
  pvcName: string,
  targetNS: string,
  sourceNS?: string,
): Promise<PersistentVolumeClaimKind> => {
  let namespace = fastify.kube.namespace;
  if (sourceNS) {
    namespace = sourceNS;
  }
  const PVC = await fastify.kube.coreV1Api
    .readNamespacedPersistentVolumeClaim(pvcName, namespace)
    .then((res) => {
      return res.body as PersistentVolumeClaimKind;
    });
  fastify.kube.coreV1Api.patchPersistentVolume(
    PVC.spec.volumeName,
    { spec: { persistentVolumeReclaimPolicy: 'Retain' } },
    undefined,
    undefined,
    undefined,
    undefined,
    {
      headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
    },
  );
  // DEBUG PATCH, THIS SHOULD BE REMOVED BEFORE MERGING
  fastify.kube.coreV1Api.patchNamespacedPersistentVolumeClaim(
    PVC.metadata.name,
    namespace,
    { metadata: { finalizers: undefined}},
    undefined,
    undefined,
    undefined,
    undefined,
    {
      headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
    },
  );
  fastify.kube.coreV1Api.deleteNamespacedPersistentVolumeClaim(pvcName, namespace);
  fastify.kube.coreV1Api.patchPersistentVolume(
    PVC.spec.volumeName,
    { spec: { claimRef: { namespace: targetNS, name: PVC.metadata.name, uid: null } } },
    undefined,
    undefined,
    undefined,
    undefined,
    {
      headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
    },
  );
  // Hardcoded timeout to give the PV some time to unbind itself properly
  await new Promise((f) => setTimeout(f, 500));
  const copyPVC: PersistentVolumeClaimKind = {
    apiVersion: PVC.apiVersion,
    kind: PVC.kind,
    metadata: {
      name: pvcName,
      namespace: targetNS,
    },
    spec: PVC.spec,
  };
  await fastify.kube.coreV1Api.createNamespacedPersistentVolumeClaim(targetNS, copyPVC);
  const newPVC = await fastify.kube.coreV1Api.readNamespacedPersistentVolumeClaim(
    copyPVC.metadata.name,
    targetNS,
  );
  fastify.kube.coreV1Api.patchPersistentVolume(
    PVC.spec.volumeName,
    { spec: { claimRef: { uid: newPVC.body.metadata.uid, name: null } } },
    undefined,
    undefined,
    undefined,
    undefined,
    {
      headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
    },
  );
  return newPVC.body as PersistentVolumeClaimKind;
};
