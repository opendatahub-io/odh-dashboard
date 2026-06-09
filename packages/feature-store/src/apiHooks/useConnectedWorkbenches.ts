import * as React from 'react';
import useFetch, { FetchStateCallbackPromise } from '@odh-dashboard/internal/utilities/useFetch';
import { getProjectsWithWorkbenches } from '../api/connectedWorkbenches';
import {
  ConnectedWorkbenchesResponse,
  FeastProjectWithWorkbenches,
} from '../types/connectedWorkbenches';

type UseConnectedWorkbenchesReturn = {
  projects: FeastProjectWithWorkbenches[];
  selectedProject: FeastProjectWithWorkbenches | undefined;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
};

const EMPTY_RESPONSE: ConnectedWorkbenchesResponse = { connectedWorkbenches: [] };

export const useConnectedWorkbenches = (
  feastProjectName?: string,
  enabled = true,
): UseConnectedWorkbenchesReturn => {
  const callback = React.useCallback<
    FetchStateCallbackPromise<ConnectedWorkbenchesResponse>
  >(async () => {
    if (!enabled) {
      return EMPTY_RESPONSE;
    }
    const response = await getProjectsWithWorkbenches();
    if (!Array.isArray(response.connectedWorkbenches)) {
      throw new Error('Invalid response from connected workbenches API');
    }
    return response;
  }, [enabled]);

  const {
    data,
    loaded,
    error,
    refresh: refreshData,
  } = useFetch(callback, EMPTY_RESPONSE, {
    initialPromisePurity: true,
  });

  const refresh = React.useCallback(async () => {
    await refreshData();
  }, [refreshData]);

  const connectedWorkbenches = React.useMemo(
    () => data.connectedWorkbenches,
    [data.connectedWorkbenches],
  );

  const selectedProject = React.useMemo(
    () =>
      feastProjectName
        ? connectedWorkbenches.find((p) => p.feastProjectName === feastProjectName)
        : undefined,
    [connectedWorkbenches, feastProjectName],
  );

  return {
    projects: connectedWorkbenches,
    selectedProject,
    loaded,
    error,
    refresh,
  };
};

export default useConnectedWorkbenches;
