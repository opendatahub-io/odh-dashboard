import * as React from 'react';
import { useFetchState, FetchStateObject, FetchStateCallbackPromise } from 'mod-arch-core';
import { getLSDstatus } from '~/app/services/llamaStackService';
import { LlamaStackDistributionModel } from '~/app/types';
import { NO_REFRESH_INTERVAL, REFRESH_INTERVAL } from '~/app/const';

const useFetchLSDStatus = (
  selectedProject?: string,
  activelyRefresh?: boolean,
): FetchStateObject<LlamaStackDistributionModel | null> => {
  const fetchLSDStatus = React.useCallback<
    FetchStateCallbackPromise<LlamaStackDistributionModel | null>
  >(async () => {
    if (!selectedProject) {
      return Promise.reject(new Error('No project selected'));
    }
    return getLSDstatus(selectedProject);
  }, [selectedProject]);

  const [data, loaded, error, refresh] = useFetchState(fetchLSDStatus, null, {
    initialPromisePurity: true,
    // Refresh every 3 seconds if actively refreshing
    refreshRate: activelyRefresh ? REFRESH_INTERVAL : NO_REFRESH_INTERVAL,
  });
  return { data, loaded, error, refresh };
};

export default useFetchLSDStatus;
