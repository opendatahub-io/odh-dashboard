import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { conditionalArea, SupportedArea } from '#~/concepts/areas';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { CompareRunsSearchParam } from '#~/concepts/pipelines/content/types';
import useNotification from '#~/utilities/useNotification';
import { allSettledPromises } from '#~/utilities/allSettledPromises';
import useFetchState, { FetchStateCallbackPromise } from '#~/utilities/useFetchState';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';

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
  const fetchSuccessfulRuns = React.useCallback<FetchStateCallbackPromise<PipelineRunKF[]>>(
    (opts) =>
      allSettledPromises(runIdsArray.map((id) => api.getPipelineRun(opts, id))).then(
        ([successful]) => successful.map(({ value }) => value),
      ),
    [api, runIdsArray],
  );

  const [runs, loaded] = useFetchState(fetchSuccessfulRuns, []);

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
