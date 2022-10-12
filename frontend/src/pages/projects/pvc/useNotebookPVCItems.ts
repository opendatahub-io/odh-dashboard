import * as React from 'react';
import { NotebookKind, PersistentVolumeClaimKind } from '../../../k8sTypes';
import { getNotebookPVCNames } from './utils';
import { useDeepCompareMemoize } from '../../../utilities/useDeepCompareMemoize';
import { getPvc } from '../../../api';

const useNotebookPVCItems = (
  notebook: NotebookKind,
): [pvcs: PersistentVolumeClaimKind[], loaded: boolean, loadError?: Error] => {
  const [pvcs, setPVCs] = React.useState<PersistentVolumeClaimKind[]>([]);
  const [loadError, setLoadError] = React.useState<Error | undefined>();
  const [loaded, setLoaded] = React.useState(false);

  const pvcNames = useDeepCompareMemoize(getNotebookPVCNames(notebook));
  const projectName = notebook.metadata.namespace;

  React.useEffect(() => {
    Promise.all(pvcNames.map((pvcName) => getPvc(projectName, pvcName)))
      .then((newPVCs) => {
        setPVCs(newPVCs);
        setLoaded(true);
      })
      .catch((e) => setLoadError(e));
  }, [projectName, pvcNames]);

  return [pvcs, loaded, loadError];
};

export default useNotebookPVCItems;
