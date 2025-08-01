import * as React from 'react';
import { AppContext } from '#~/app/AppContext';
import { MetadataAnnotation, StorageClassKind } from '#~/k8sTypes';

/**
 * @deprecated This hook has been consolidated into useDefaultStorageClass.
 * Do not import this hook directly. Use useDefaultStorageClass instead.
 */
const usePreferredStorageClass = (): StorageClassKind | undefined => {
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

// Commented out to prevent external imports - logic moved to useDefaultStorageClass
// export default usePreferredStorageClass;
