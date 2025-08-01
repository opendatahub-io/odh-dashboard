import * as React from 'react';
import { AppContext } from '#~/app/AppContext';
import { MetadataAnnotation, StorageClassKind } from '#~/k8sTypes';

/**
 * @deprecated This hook has been consolidated into useDefaultStorageClass.
 * Do not import this hook directly. Use useDefaultStorageClass instead.
 */
const useOpenshiftDefaultStorageClass = (): StorageClassKind | undefined => {
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

// Commented out to prevent external imports - logic moved to useDefaultStorageClass
// export default useOpenshiftDefaultStorageClass;
