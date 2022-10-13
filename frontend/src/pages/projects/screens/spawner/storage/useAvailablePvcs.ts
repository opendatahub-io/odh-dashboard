import * as React from 'react';
import { getAvailablePvcs } from '../../../../../api';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';

const useAvailablePvcs = (): [
  pvcs: PersistentVolumeClaimKind[],
  loaded: boolean,
  loadError: Error | undefined,
  fetchPvcs: (projectName?: string) => void,
] => {
  const [pvcs, setPvcs] = React.useState<PersistentVolumeClaimKind[]>([]);
  const [loaded, setLoaded] = React.useState(true);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  const fetchPvcs = React.useCallback((projectName?: string) => {
    if (projectName) {
      setLoaded(false);
      getAvailablePvcs(projectName)
        .then((newPvcs) => {
          setPvcs(newPvcs);
          setLoaded(true);
        })
        .catch((e) => {
          setLoadError(e);
          setLoaded(true);
        });
    } else {
      setPvcs([]);
      setLoaded(true);
      setLoadError(undefined);
    }
  }, []);

  return [pvcs, loaded, loadError, fetchPvcs];
};

export default useAvailablePvcs;
