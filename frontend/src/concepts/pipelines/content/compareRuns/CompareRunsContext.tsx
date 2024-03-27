import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { CompareRunsSearchParam } from '~/concepts/pipelines/content/types';
import { usePipelineRunsByIds } from '~/concepts/pipelines/apiHooks/usePipelineRunById';
import useNotification from '~/utilities/useNotification';

type CompareRunsContextType = {
  runs: PipelineRunKFv2[];
  selectedRuns: PipelineRunKFv2[];
  setRuns: (runs: PipelineRunKFv2[]) => void;
  setSelectedRuns: React.Dispatch<React.SetStateAction<PipelineRunKFv2[]>>;
  loaded: boolean;
  error?: Error;
};

const CompareRunsContext = React.createContext<CompareRunsContextType>({
  runs: [],
  loaded: false,
  error: undefined,
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

  // fetch runs
  const [runs, loaded, error] = usePipelineRunsByIds(runIdsArray);
  const [selectedRuns, setSelectedRuns] = React.useState<PipelineRunKFv2[]>([]);

  // cleanup runs search param url
  const notification = useNotification();
  React.useEffect(() => {
    if (runs.length > 0) {
      // 5 = Not found https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto#L78
      const validRuns = runs.filter(({ error: runError }) => runError?.code !== 5);

      // if there exists invalid runs, remove them from the url and notify the user
      if (validRuns.length !== runIdsArray.length) {
        searchParams.set(
          CompareRunsSearchParam.RUNS,
          validRuns.map(({ run_id: runId }) => runId).join(','),
        );
        setSearchParams(searchParams);
        notification.info('Invalid runs are removed from the compare list.');
      }
    }
  }, [notification, runIdsArray.length, runs, searchParams, setSearchParams]);

  React.useEffect(() => {
    setSelectedRuns(runs);
  }, [runs]);

  const setRuns = (selected: PipelineRunKFv2[]) => {
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
        error,
        setRuns,
        setSelectedRuns,
      }}
    >
      {children}
    </CompareRunsContext.Provider>
  );
});

export const useCompareRuns = (): CompareRunsContextType => React.useContext(CompareRunsContext);
