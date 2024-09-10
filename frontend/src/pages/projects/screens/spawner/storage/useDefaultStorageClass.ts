import * as React from 'react';
import useStorageClasses from '~/concepts/k8s/useStorageClasses';
import { StorageClassKind } from '~/k8sTypes';
import {
  getStorageClassConfig,
  isOpenshiftDefaultStorageClass,
} from '~/pages/storageClasses/utils';

const useDefaultStorageClass = (): StorageClassKind | undefined => {
  const [storageClasses, storageClassesLoaded] = useStorageClasses();
  const [defaultStorageClass, setDefaultStorageClass] = React.useState<
    StorageClassKind | undefined
  >();

  React.useEffect(() => {
    if (!storageClassesLoaded) {
      return;
    }

    const defaultSc = storageClasses.find(
      (sc) => isOpenshiftDefaultStorageClass(sc) || getStorageClassConfig(sc)?.isDefault,
    );
    setDefaultStorageClass(defaultSc);
  }, [storageClasses, storageClassesLoaded]);

  return defaultStorageClass;
};

export default useDefaultStorageClass;
