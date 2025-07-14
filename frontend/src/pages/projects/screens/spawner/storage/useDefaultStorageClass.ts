import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import useStorageClasses from '#~/concepts/k8s/useStorageClasses';
import { StorageClassKind } from '#~/k8sTypes';
import useAdminDefaultStorageClass from '#~/pages/projects/screens/spawner/storage/useAdminDefaultStorageClass';
import useOpenshiftDefaultStorageClass from '#~/pages/projects/screens/spawner/storage/useOpenshiftDefaultStorageClass';
import usePreferredStorageClass from '#~/pages/projects/screens/spawner/storage/usePreferredStorageClass';
import { FetchState } from '#~/utilities/useFetchState';

export const useDefaultStorageClass = (
  fallbackToFirst = false,
): FetchState<StorageClassKind | null> => {
  const [defaultStorageClass, defaultStorageClassLoaded, defaultStorageClassError, refresh] =
    useAdminDefaultStorageClass();
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const preferredStorageClass = usePreferredStorageClass();
  const openshiftDefaultStorageClass = useOpenshiftDefaultStorageClass();
  const [storageClasses, storageClassesLoaded, storageClassesError] = useStorageClasses();

  let storageClass: StorageClassKind | null = null;
  let error: Error | undefined;
  let loaded = true;

  // if using storage class feature, use default storage class
  if (isStorageClassesAvailable && (defaultStorageClassError || storageClassesLoaded)) {
    storageClass = defaultStorageClass;
    error = defaultStorageClassError;
    loaded = defaultStorageClassLoaded;
  }

  // otherwise, use preferred storage class if available
  else if (preferredStorageClass) {
    storageClass = preferredStorageClass;
  }

  // otherwise, use openshift default storage class if available
  else if (openshiftDefaultStorageClass) {
    storageClass = openshiftDefaultStorageClass;
  }

  // otherwise, use first storage class if fallbackToFirst is true
  if (fallbackToFirst && (storageClassesLoaded || storageClassesError)) {
    storageClass = storageClasses[0] || null;
    error = storageClassesError;
    loaded = storageClassesLoaded;
  }

  // otherwise, return null and no error and loaded
  return [storageClass, loaded, error, refresh];
};
