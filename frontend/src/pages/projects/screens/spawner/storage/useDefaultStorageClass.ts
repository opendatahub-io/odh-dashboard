import * as React from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import useStorageClasses from '~/concepts/k8s/useStorageClasses';
import { StorageClassKind } from '~/k8sTypes';
import { getStorageClassConfig } from '~/pages/storageClasses/utils';

const useDefaultStorageClass = (): StorageClassKind | undefined => {
  const isStorageClassesAvailable = useIsAreaAvailable(SupportedArea.STORAGE_CLASSES).status;
  const [storageClasses, storageClassesLoaded] = useStorageClasses();
  const [defaultStorageClass, setDefaultStorageClass] = React.useState<
    StorageClassKind | undefined
  >();

  React.useEffect(() => {
    if (!storageClassesLoaded || !isStorageClassesAvailable) {
      return;
    }

    const defaultSc = storageClasses.find((sc) => getStorageClassConfig(sc)?.isDefault);

    if (!defaultSc && storageClasses.length > 0) {
      setDefaultStorageClass(storageClasses[0]);
    } else {
      setDefaultStorageClass(defaultSc);
    }
  }, [storageClasses, storageClassesLoaded, isStorageClassesAvailable]);

  return defaultStorageClass;
};

export default useDefaultStorageClass;
