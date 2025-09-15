import * as React from 'react';
import { useFetchState, FetchStateObject, FetchStateCallbackPromise } from 'mod-arch-core';
import { getLSDstatus } from '~/app/services/llamaStackService';
import { LlamaStackDistributionModel } from '~/app/types';

const useFetchLSDStatus = (
  selectedProject?: string,
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
  });
  return { data, loaded, error, refresh };
};

export default useFetchLSDStatus;
