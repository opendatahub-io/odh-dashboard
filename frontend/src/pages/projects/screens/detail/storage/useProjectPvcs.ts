import * as React from 'react';
import { getPvcs } from '~/api';
import { PersistentVolumeClaimKind } from '~/k8sTypes';

const useProjectPvcs = (
  namespace?: string,
): [
  pvcs: PersistentVolumeClaimKind[],
  loaded: boolean,
  loadError: Error | undefined,
  forceRefresh: () => void,
] => {
  const [pvcs, setPvcs] = React.useState<PersistentVolumeClaimKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  const getProjectPvcs = React.useCallback(() => {
    if (namespace) {
      getPvcs(namespace)
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
  }, [namespace]);

  const forceRefresh = React.useCallback(() => {
    getProjectPvcs();
  }, [getProjectPvcs]);

  React.useEffect(() => {
    getProjectPvcs();
  }, [getProjectPvcs]);

  return [pvcs, loaded, loadError, forceRefresh];
};

export default useProjectPvcs;
