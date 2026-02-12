import React from 'react';
import { PersistentVolumeClaimKind, ServingRuntimeKind } from '#~/k8sTypes';
import { getPvc } from '#~/api';

type NIMPVCState = {
  pvcSize: string;
  setPvcSize: React.Dispatch<React.SetStateAction<string>>;
  pvc: PersistentVolumeClaimKind | undefined;
};

export const useNIMPVC = (
  namespace: string | undefined,
  servingRuntimeEditInfo?: ServingRuntimeKind,
): NIMPVCState => {
  const [pvc, setPvc] = React.useState<PersistentVolumeClaimKind | undefined>();
  const [pvcSize, setPvcSize] = React.useState<string>('30Gi');

  React.useEffect(() => {
    const fetchPVC = async () => {
      if (namespace && servingRuntimeEditInfo) {
        const pvcName = servingRuntimeEditInfo.spec.volumes?.find(
          (vol) => vol.persistentVolumeClaim?.claimName,
        )?.persistentVolumeClaim?.claimName;
        if (pvcName) {
          const pvcData = await getPvc(namespace, pvcName);
          setPvc(pvcData);
          const size = pvcData.spec.resources.requests.storage;
          if (size) {
            setPvcSize(size);
          }
        }
      }
    };
    fetchPVC();
  }, [namespace, servingRuntimeEditInfo]);

  return { pvcSize, setPvcSize, pvc };
};
