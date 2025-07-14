import React from 'react';
import useFetchState, { FetchState, FetchStateCallbackPromise } from '#~/utilities/useFetchState';
import { DataScienceClusterKind } from '#~/k8sTypes';
import { listDataScienceClusters } from '#~/api';

const useDefaultDsc = (): FetchState<DataScienceClusterKind | null> => {
  const callback = React.useCallback<FetchStateCallbackPromise<DataScienceClusterKind | null>>(
    () => listDataScienceClusters().then((dataScienceClusters) => dataScienceClusters[0]),
    [],
  );

  return useFetchState(callback, null);
};

export default useDefaultDsc;
