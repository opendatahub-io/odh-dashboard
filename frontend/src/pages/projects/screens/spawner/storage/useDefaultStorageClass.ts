import * as React from 'react';
import { AppContext } from '#~/app/AppContext';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import useStorageClasses from '#~/concepts/k8s/useStorageClasses';
import { MetadataAnnotation, StorageClassKind } from '#~/k8sTypes';
import { getStorageClassConfig } from '#~/pages/storageClasses/utils';
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '#~/utilities/useFetchState';

// Internal helper function for admin default storage class logic
const useAdminDefaultStorageClassInternal = (): FetchState<StorageClassKind | null> => {
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

// Internal helper function for preferred storage class logic
const usePreferredStorageClassInternal = (): StorageClassKind | undefined => {
  const {
    dashboardConfig: {
      spec: { notebookController },
    },
    storageClasses,
  } = React.useContext(AppContext);

  const defaultClusterStorageClasses = storageClasses.filter(
    (storageclass) =>
      storageclass.metadata.annotations?.[MetadataAnnotation.StorageClassIsDefault] === 'true',
  );

  const configStorageClassName = notebookController?.storageClassName ?? '';

  if (defaultClusterStorageClasses.length !== 0) {
    return undefined;
  }

  if (configStorageClassName === '') {
    return undefined;
  }

  const storageClassDashBoardConfigVsCluster = storageClasses.filter(
    (storageclass) => storageclass.metadata.name === configStorageClassName,
  );

  if (storageClassDashBoardConfigVsCluster.length === 0) {
    // eslint-disable-next-line no-console
    console.error(
      'no cluster default storageclass set and notebookController.storageClassName entry is not in list of cluster StorageClasses',
    );

    return undefined;
  }

  return storageClassDashBoardConfigVsCluster[0];
};

// Internal helper function for OpenShift default storage class logic
const useOpenshiftDefaultStorageClassInternal = (): StorageClassKind | undefined => {
  const { storageClasses } = React.useContext(AppContext);

  const defaultClusterStorageClasses = storageClasses.filter(
    (storageclass) =>
      storageclass.metadata.annotations?.[MetadataAnnotation.StorageClassIsDefault] === 'true',
  );

  if (defaultClusterStorageClasses.length > 0) {
    return defaultClusterStorageClasses[0];
  }

  return undefined;
};

export const useDefaultStorageClass = (
  fallbackToFirst = false,
): FetchState<StorageClassKind | null> => {
  const [
    adminDefaultStorageClass,
    adminDefaultStorageClassLoaded,
    adminDefaultStorageClassError,
    refresh,
  ] = useAdminDefaultStorageClassInternal();
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const preferredStorageClass = usePreferredStorageClassInternal();
  const openshiftDefaultStorageClass = useOpenshiftDefaultStorageClassInternal();
  const [storageClasses, storageClassesLoaded, storageClassesError] = useStorageClasses();

  let storageClass: StorageClassKind | null = null;
  let error: Error | undefined;
  let loaded = true;

  // 1. First priority: admin storage class (from Dashboard Admin Configuration)
  if (
    isStorageClassesAvailable &&
    adminDefaultStorageClassLoaded &&
    !adminDefaultStorageClassError
  ) {
    storageClass = adminDefaultStorageClass;
    loaded = adminDefaultStorageClassLoaded;
  }
  // 2. Second priority: preferred storage class (from OdhDashboardConfig CR)
  else if (preferredStorageClass) {
    storageClass = preferredStorageClass;
  }
  // 3. Third priority: OpenShift default storage class
  else if (openshiftDefaultStorageClass) {
    storageClass = openshiftDefaultStorageClass;
  }
  // 4. Fourth priority: first storage class in the list (if fallbackToFirst is true)
  else if (fallbackToFirst && (storageClassesLoaded || storageClassesError)) {
    storageClass = storageClasses[0] || null;
    error = storageClassesError;
    loaded = storageClassesLoaded;
  }

  // If no storage class was found and admin default had an error, use that error
  if (!storageClass && isStorageClassesAvailable && adminDefaultStorageClassError) {
    error = adminDefaultStorageClassError;
    loaded = adminDefaultStorageClassLoaded;
  }

  return [storageClass, loaded, error, refresh];
};
