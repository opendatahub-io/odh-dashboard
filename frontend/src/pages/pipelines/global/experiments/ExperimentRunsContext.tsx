import React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { Outlet } from 'react-router-dom';
import { ExperimentKFv2, StorageStateKF } from '~/concepts/pipelines/kfTypes';
import { useExperimentByParams } from '~/pages/pipelines/global/experiments/useExperimentByParams';

type ExperimentRunsContextState = {
  experiment: ExperimentKFv2 | null;
};

export const ExperimentRunsContext = React.createContext<ExperimentRunsContextState>({
  experiment: null,
});

const ExperimentRunsContextProvider: React.FC = () => {
  const { experiment, isExperimentLoaded } = useExperimentByParams();

  const contextValue = React.useMemo(() => ({ experiment }), [experiment]);

  if (!isExperimentLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ExperimentRunsContext.Provider value={contextValue}>
      <Outlet />
    </ExperimentRunsContext.Provider>
  );
};

export const useContextExperimentArchived = (): boolean => {
  const { experiment } = React.useContext(ExperimentRunsContext);
  return experiment?.storage_state === StorageStateKF.ARCHIVED;
};

export default ExperimentRunsContextProvider;
