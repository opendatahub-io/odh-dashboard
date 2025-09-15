import * as React from 'react';
import { useFetchState, FetchStateObject, FetchStateCallbackPromise } from 'mod-arch-core';
import { getLSDstatus } from '~/app/services/llamaStackService';
import { LlamaStackDistributionModel } from '~/app/types';

const useFetchLSDStatus = (
  selectedProject: string,
): FetchStateObject<LlamaStackDistributionModel | null> => {
  const fetchLSDStatus = React.useCallback<
    FetchStateCallbackPromise<LlamaStackDistributionModel | null>
  >(async () => {
    try {
      const status: LlamaStackDistributionModel = await getLSDstatus(selectedProject);
      return status;
    } catch {
      return null;
    }
  }, [selectedProject]);

  const [data, loaded, error, refresh] = useFetchState(fetchLSDStatus, null);
  return { data, loaded, error, refresh };
};

export default useFetchLSDStatus;
