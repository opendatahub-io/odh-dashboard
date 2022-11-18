import * as React from 'react';
import { getPvc } from '../../../../../api';
import { NotebookKind, PersistentVolumeClaimKind } from '../../../../../k8sTypes';
import { ROOT_MOUNT_PATH } from '../../../pvc/const';

const useNotebookRootStorage = (notebook?: NotebookKind): PersistentVolumeClaimKind | undefined => {
  const [pvc, setPvc] = React.useState<PersistentVolumeClaimKind>();

  React.useEffect(() => {
    if (notebook) {
      const volumeMounts = notebook.spec.template.spec.containers[0].volumeMounts || [];
      const volumeMount = volumeMounts.find(
        (volumeMount) => volumeMount.mountPath === ROOT_MOUNT_PATH,
      );
      if (!volumeMount) {
        console.error('No storage mounted on root path');
        setPvc(undefined);
      } else {
        getPvc(notebook.metadata.namespace, volumeMount.name).then((pvc) => setPvc(pvc));
      }
    }
  }, [notebook]);

  return pvc;
};

export default useNotebookRootStorage;
