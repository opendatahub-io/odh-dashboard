import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import useFetchState, {
  FetchStateCallbackPromise,
} from '@odh-dashboard/ui-core/hooks/useFetchState';
import { conditionalArea } from '@odh-dashboard/ui-core/components/conditionalArea';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { CompareRunsSearchParam } from '#~/concepts/pipelines/content/types';
import useNotification from '#~/utilities/useNotification';
import { allSettledPromises } from '#~/utilities/allSettledPromises';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { GrpcStatusCode } from '#~/api/pipelines/errorUtils';

type CompareRunsContextType = {
  runs: PipelineRunKF[];
  selectedRuns: PipelineRunKF[];
  setRuns: (runs: PipelineRunKF[]) => void;
  setSelectedRuns: React.Dispatch<React.SetStateAction<PipelineRunKF[]>>;
  loaded: boolean;
};

const CompareRunsContext = React.createContext<CompareRunsContextType>({
  runs: [],
  loaded: false,
  setRuns: () => undefined,
  selectedRuns: [],
  setSelectedRuns: () => undefined,
});

type CompareRunsContextProviderProps = {
  children: React.ReactNode;
};

export const CompareRunsContextProvider = conditionalArea<CompareRunsContextProviderProps>(
  SupportedArea.DS_PIPELINES,
  true,
)(({ children }) => {
  // get run ids from url
  const [searchParams, setSearchParams] = useSearchParams();
  const runIdsArray = React.useMemo(() => {
    const runIds = searchParams.get(CompareRunsSearchParam.RUNS);
    return runIds ? runIds.split(',') : [];
  }, [searchParams]);

  // get runs from run ids
  const { api } = usePipelinesAPI();
  const fetchValidRuns = React.useCallback<FetchStateCallbackPromise<PipelineRunKF[]>>(
    (opts) =>
      allSettledPromises<PipelineRunKF, { grpcCode?: number; result?: PipelineRunKF }>(
        runIdsArray.map((id) => api.getPipelineRun(opts, id)),
      ).then(([successful, rejected]) => {
        const nonNotFound = rejected
          .filter(
            ({ reason }) => reason.grpcCode != null && reason.grpcCode !== GrpcStatusCode.NOT_FOUND,
          )
          .map(({ reason }) => reason.result)
          .filter((result): result is PipelineRunKF => result != null);
        return [...successful.map(({ value }) => value), ...nonNotFound];
      }),
    [api, runIdsArray],
  );

  const [runs, loaded] = useFetchState(fetchValidRuns, []);

  // cleanup runs search param url
  const notification = useNotification();
  React.useEffect(() => {
    // if there exists invalid runs, remove them from the url and notify the user
    if (loaded && runs.length !== runIdsArray.length) {
      searchParams.set(
        CompareRunsSearchParam.RUNS,
        runs.map(({ run_id: runId }) => runId).join(','),
      );
      setSearchParams(searchParams);
      notification.error('Invalid runs were removed from the compare list');
    }
  }, [loaded, notification, runIdsArray.length, runs, searchParams, setSearchParams]);

  const [selectedRuns, setSelectedRuns] = React.useState<PipelineRunKF[]>([]);
  React.useEffect(() => {
    setSelectedRuns(runs);
  }, [runs]);

  const setRuns = (selected: PipelineRunKF[]) => {
    searchParams.set(
      CompareRunsSearchParam.RUNS,
      selected.map(({ run_id: runId }) => runId).join(','),
    );
    setSearchParams(searchParams);
    setSelectedRuns(selected);
  };

  return (
    <CompareRunsContext.Provider
      value={{
        runs,
        selectedRuns,
        loaded,
        setRuns,
        setSelectedRuns,
      }}
    >
      {children}
    </CompareRunsContext.Provider>
  );
});

export const useCompareRuns = (): CompareRunsContextType => React.useContext(CompareRunsContext);
