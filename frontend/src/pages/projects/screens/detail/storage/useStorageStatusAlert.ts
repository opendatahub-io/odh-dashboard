import * as React from 'react';
import { useBrowserStorage } from '../../../../../components/browserStorage';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';
import useNotification from '../../../../../utilities/useNotification';
import { getPvcDisplayName } from '../../../utils';
import { getFullStatusFromPercentage } from './utils';

type PercentageStorageStatus = {
  [projectName: string]: {
    /** string value is the last status that was used for this pvcName */
    [pvcName: string]: string;
  };
};

const useStorageStatusAlert = (pvc: PersistentVolumeClaimKind, percentageFull: number): void => {
  const notification = useNotification();

  const [percentageStorageStatuses, setPercentageStorageStatuses] =
    useBrowserStorage<PercentageStorageStatus>(
      'odh.dashboard.pvc.last.notification',
      {},
      true,
      true,
    );

  const lastStatus = percentageStorageStatuses[pvc.metadata.namespace]?.[pvc.metadata.name];

  React.useEffect(() => {
    const currentStatus = getFullStatusFromPercentage(percentageFull);
    if (!isNaN(percentageFull)) {
      if (lastStatus !== currentStatus) {
        if (currentStatus) {
          notification[currentStatus](
            `Cluster storage "${getPvcDisplayName(pvc)}" is ${percentageFull}% full`,
          );
          const newValue = {
            ...percentageStorageStatuses,
            [pvc.metadata.namespace]: {
              ...percentageStorageStatuses[pvc.metadata.namespace],
              [pvc.metadata.name]: currentStatus,
            },
          };
          setPercentageStorageStatuses(newValue);
        } else if (lastStatus) {
          const newValue = { ...percentageStorageStatuses };
          delete newValue[pvc.metadata.namespace]?.[pvc.metadata.name];
          setPercentageStorageStatuses(newValue);
        }
      }
    }
  }, [
    lastStatus,
    percentageFull,
    notification,
    pvc,
    percentageStorageStatuses,
    setPercentageStorageStatuses,
  ]);
};

export default useStorageStatusAlert;
