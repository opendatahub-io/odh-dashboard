import React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { Outlet } from 'react-router-dom';
import { ExperimentKF, StorageStateKF } from '~/concepts/pipelines/kfTypes';
import { useExperimentByParams } from '~/pages/pipelines/global/experiments/useExperimentByParams';
import { experimentRoute } from '~/routes/pipelines/experiments';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type ExperimentContextState = {
  experiment: ExperimentKF | null;
  basePath: string;
};

export const ExperimentContext = React.createContext<ExperimentContextState>({
  experiment: null,
  basePath: '',
});

const ExperimentContextProvider: React.FC = () => {
  const { experiment, isExperimentLoaded } = useExperimentByParams();
  const { namespace } = usePipelinesAPI();

  const contextValue = React.useMemo(
    () => ({ experiment, basePath: experimentRoute(namespace, experiment?.experiment_id) }),
    [experiment, namespace],
  );

  if (!isExperimentLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ExperimentContext.Provider value={contextValue}>
      <Outlet />
    </ExperimentContext.Provider>
  );
};

export const useContextExperimentArchivedOrDeleted = (
  experimentAvailable?: ExperimentKF | null,
): { isExperimentArchived: boolean; isExperimentDeleted: boolean } => {
  const { experiment } = React.useContext(ExperimentContext);
  const experimentStorageState = experimentAvailable?.storage_state ?? experiment?.storage_state;
  return {
    isExperimentArchived: experimentStorageState === StorageStateKF.ARCHIVED,
    isExperimentDeleted: !experimentStorageState,
  };
};

export default ExperimentContextProvider;
