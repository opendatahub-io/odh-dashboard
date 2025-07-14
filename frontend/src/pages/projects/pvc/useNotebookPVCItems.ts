import * as React from 'react';
import { NotebookKind, PersistentVolumeClaimKind } from '#~/k8sTypes';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { getNotebookPVCNames } from './utils';

const useNotebookPVCItems = (
  notebook: NotebookKind | undefined,
): [pvcs: PersistentVolumeClaimKind[], loaded: boolean, loadError?: Error] => {
  const {
    pvcs: { data: allPvcs, loaded, error },
  } = React.useContext(ProjectDetailsContext);

  const pvcNames = useDeepCompareMemoize(notebook && getNotebookPVCNames(notebook));

  const pvcs = React.useMemo(
    () => allPvcs.filter((pvc) => pvcNames?.includes(pvc.metadata.name)),
    [allPvcs, pvcNames],
  );

  return [pvcs, loaded, error];
};

export default useNotebookPVCItems;
