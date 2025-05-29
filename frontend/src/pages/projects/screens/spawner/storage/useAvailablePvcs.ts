import * as React from 'react';
import * as _ from 'lodash-es';
import { getDashboardPvcs } from '#~/api';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { NotebookState } from '#~/pages/projects/notebook/types';
import { getNotebookPVCNames } from '#~/pages/projects/pvc/utils';

const useAvailablePvcs = (
  projectName: string,
  notebooks: NotebookState[],
  editStorage?: string,
): [pvcs: PersistentVolumeClaimKind[], loaded: boolean, loadError: Error | undefined] => {
  const [pvcs, setPvcs] = React.useState<PersistentVolumeClaimKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  React.useEffect(() => {
    if (projectName) {
      getDashboardPvcs(projectName)
        .then((newPvcs) => {
          const usedPvcs = _.uniq(
            notebooks.flatMap((notebook) => getNotebookPVCNames(notebook.notebook)),
          );
          const filteredPvc = editStorage
            ? usedPvcs.filter((pvc) => pvc !== editStorage)
            : usedPvcs;
          setPvcs(newPvcs.filter((pvc) => !filteredPvc.includes(pvc.metadata.name)));
          setLoaded(true);
        })
        .catch((e) => {
          setLoadError(e);
          setLoaded(true);
        });
    }
  }, [projectName, notebooks, editStorage]);

  return [pvcs, loaded, loadError];
};

export default useAvailablePvcs;
