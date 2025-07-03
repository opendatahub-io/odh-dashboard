import * as React from 'react';
import { PersistentVolumeClaimKind } from '#~/k8sTypes';
import { FetchStateObject } from '#~/utilities/useFetch';
import { getDashboardPvcs } from '#~/api/k8s/pvcs';

const DEFAULT_LIST_FETCH_STATE: FetchStateObject<PersistentVolumeClaimKind[]> = {
  data: [],
  loaded: false,
  error: undefined,
  refresh: () => Promise.resolve([]),
};

export default function usePvcs(namespace: string): FetchStateObject<PersistentVolumeClaimKind[]> {
  const [state, setState] =
    React.useState<FetchStateObject<PersistentVolumeClaimKind[]>>(DEFAULT_LIST_FETCH_STATE);

  const fetchPvcs = React.useCallback((): Promise<PersistentVolumeClaimKind[]> => {
    setState((prev) => ({ ...prev, loaded: false, error: undefined }));
    return getDashboardPvcs(namespace)
      .then((pvcs) => {
        setState({
          data: pvcs,
          loaded: true,
          error: undefined,
          refresh: fetchPvcs,
        });
        return pvcs;
      })
      .catch((error) => {
        setState({
          data: [],
          loaded: true,
          error,
          refresh: fetchPvcs,
        });
        return [];
      });
  }, [namespace]);

  React.useEffect(() => {
    if (namespace) {
      fetchPvcs();
    } else {
      setState(DEFAULT_LIST_FETCH_STATE);
    }
    // Only re-fetch when namespace changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace]);

  return React.useMemo(
    () => ({
      ...state,
      refresh: fetchPvcs,
    }),
    [state, fetchPvcs],
  );
}
