import * as React from 'react';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import useStorageClasses from '#~/concepts/k8s/useStorageClasses';
import { StorageClassKind } from '#~/k8sTypes';
import { getStorageClassConfig } from '#~/pages/storageClasses/utils';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';

const useAdminDefaultStorageClass = (): FetchState<StorageClassKind | null> => {
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const [storageClasses, storageClassesLoaded, storageClassesError] = useStorageClasses();

  const fetchDefaultStorageClass: FetchStateCallbackPromise<StorageClassKind | null> =
    React.useCallback(
      () =>
        new Promise((resolve, reject) => {
          if (!isStorageClassesAvailable) {
            resolve(null);
          }
          if (!storageClassesLoaded) {
            reject(new NotReadyError('Storage classes are not loaded'));
          }
          if (storageClassesError) {
            resolve(null);
          }

          const enabledStorageClasses = storageClasses.filter(
            (sc) => getStorageClassConfig(sc)?.isEnabled === true,
          );

          const defaultSc = enabledStorageClasses.find(
            (sc) => getStorageClassConfig(sc)?.isDefault === true,
          );

          if (!defaultSc && enabledStorageClasses.length > 0) {
            resolve(enabledStorageClasses[0]);
          } else if (defaultSc) {
            resolve(defaultSc);
          } else {
            resolve(null);
          }
        }),
      [storageClasses, storageClassesLoaded, storageClassesError, isStorageClassesAvailable],
    );

  return useFetchState(fetchDefaultStorageClass, null);
};

export default useAdminDefaultStorageClass;
