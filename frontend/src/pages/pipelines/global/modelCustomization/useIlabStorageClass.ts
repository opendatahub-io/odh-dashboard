import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { StorageClassKind } from '~/k8sTypes';
import useDefaultStorageClass from '~/pages/projects/screens/spawner/storage/useDefaultStorageClass';
import useOpenshiftDefaultStorageClass from '~/pages/projects/screens/spawner/storage/useOpenshiftDefaultStorageClass';
import usePreferredStorageClass from '~/pages/projects/screens/spawner/storage/usePreferredStorageClass';

export const useIlabStorageClass = (): StorageClassKind | undefined => {
  const [defaultStorageClass, defaultStorageClassLoaded, defaultStorageClassError] =
    useDefaultStorageClass();
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const preferredStorageClass = usePreferredStorageClass();
  const openshiftDefaultStorageClass = useOpenshiftDefaultStorageClass(true);

  //  not ready if defaultStorageClass is not loaded or had an error
  if (!(defaultStorageClassLoaded || defaultStorageClassError)) {
    return;
  }

  // if defaultStorageClass is not null, use it
  if (isStorageClassesAvailable && defaultStorageClass) {
    return defaultStorageClass;
  }

  // if preferredStorageClass is not null, use it
  if (preferredStorageClass) {
    return preferredStorageClass;
  }

  // if openshiftDefaultStorageClass is not null, use it
  if (openshiftDefaultStorageClass) {
    return openshiftDefaultStorageClass;
  }

  // if defaultStorageClass is null, use the default value from the pipeline input

  return undefined;
};
