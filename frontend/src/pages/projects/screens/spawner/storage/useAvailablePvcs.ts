import * as React from 'react';
import { getPvcs } from '../../../../../api';
import { PersistentVolumeClaimKind } from '../../../../../k8sTypes';

const useAvailablePvcs = (
  projectName: string,
): [pvcs: PersistentVolumeClaimKind[], loaded: boolean, loadError: Error | undefined] => {
  const [pvcs, setPvcs] = React.useState<PersistentVolumeClaimKind[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);

  React.useEffect(() => {
    if (projectName) {
      getPvcs(projectName)
        .then((newPvcs) => {
          setPvcs(newPvcs);
          setLoaded(true);
        })
        .catch((e) => {
          setLoadError(e);
          setLoaded(true);
        });
    }
  }, [projectName]);

  return [pvcs, loaded, loadError];
};

export default useAvailablePvcs;
